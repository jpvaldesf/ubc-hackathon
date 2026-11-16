"""Arc testnet calls. Every write is signed with a server-held testnet key (D-007), waits for the receipt,
and returns {"hash", "explorer_url"}. Any revert or RPC failure becomes a 502 chain_error.
Amounts here are USDC base units; the rest of the server only sees cents."""
from __future__ import annotations

import json
import logging
import os
import threading

from eth_account import Account
from web3 import Web3
from web3.exceptions import ContractCustomError, ContractLogicError, TimeExhausted, Web3Exception

from .config import REPO_ROOT, Settings
from .errors import chain_error

log = logging.getLogger("dk.chain")

ERC20_ABI = [
    {"type": "function", "name": "approve", "stateMutability": "nonpayable",
     "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
     "outputs": [{"name": "", "type": "bool"}]},
    {"type": "function", "name": "transfer", "stateMutability": "nonpayable",
     "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}],
     "outputs": [{"name": "", "type": "bool"}]},
    {"type": "function", "name": "balanceOf", "stateMutability": "view",
     "inputs": [{"name": "a", "type": "address"}], "outputs": [{"name": "", "type": "uint256"}]},
]

PHASES = {"in": 0, "out": 1}


class Chain:
    """Real chain. Tests swap in FakeChain with the same methods."""

    def __init__(self, s: Settings):
        self.s = s
        self.w3 = Web3(Web3.HTTPProvider(s.rpc_url, request_kwargs={"timeout": 30}))
        abi = json.loads((REPO_ROOT / "shared" / "abi" / "DepositEscrow.json").read_text())
        self.escrow = self.w3.eth.contract(address=Web3.to_checksum_address(s.escrow_address), abi=abi)
        self.usdc = self.w3.eth.contract(address=Web3.to_checksum_address(s.usdc_address), abi=ERC20_ABI)
        self._errors = {
            Web3.keccak(text=f"{e['name']}({','.join(i['type'] for i in e.get('inputs', []))})")[:4].hex(): e["name"]
            for e in abi if e["type"] == "error"
        }
        self._accounts = {}
        for role, var in (("landlord", "LANDLORD_PRIVATE_KEY"), ("tenant", "TENANT_PRIVATE_KEY")):
            key = os.environ.get(var)
            if key:
                self._accounts[role] = Account.from_key(key)
        self._lock = threading.Lock()  # one tx at a time: no nonce races between requests

    # ---- helpers -------------------------------------------------------------------------------
    def address(self, role: str) -> str:
        acct = self._accounts.get(role)
        if not acct:
            raise chain_error(f"server has no {role} wallet configured")
        return acct.address

    def _revert_name(self, e: Exception) -> str:
        data = getattr(e, "data", None) or (e.args[1] if len(e.args) > 1 else None) or str(e)
        data = str(data).lower().removeprefix("0x")
        name = self._errors.get(data[:8])
        return name or (getattr(e, "message", None) or str(e))[:120]

    def _send(self, role: str, fn) -> tuple[dict, object]:
        acct = self._accounts.get(role)
        if not acct:
            raise chain_error(f"server has no {role} wallet configured")
        with self._lock:
            try:
                tx = fn.build_transaction({
                    "from": acct.address,
                    "nonce": self.w3.eth.get_transaction_count(acct.address, "pending"),
                    "chainId": self.s.chain_id,
                })
                signed = acct.sign_transaction(tx)
                tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
                receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
            except (ContractCustomError, ContractLogicError) as e:
                raise chain_error(f"{fn.fn_name} reverted: {self._revert_name(e)}") from None
            except TimeExhausted:
                raise chain_error(f"{fn.fn_name}: no receipt after 60 s") from None
            except (Web3Exception, OSError, ValueError) as e:
                log.warning("rpc failure in %s: %s", fn.fn_name, type(e).__name__)
                raise chain_error(f"{fn.fn_name}: RPC failed ({type(e).__name__})") from None
        h = "0x" + receipt["transactionHash"].hex().removeprefix("0x")
        if receipt["status"] != 1:
            raise chain_error(f"{fn.fn_name} reverted (tx {h})")
        return {"hash": h, "explorer_url": self.s.explorer_tx(h)}, receipt

    # ---- reads ---------------------------------------------------------------------------------
    def lease_count(self) -> int:
        return self.escrow.functions.leaseCount().call()

    def appeal_window(self) -> int:
        return self.escrow.functions.appealWindow().call()

    # ---- writes (amounts in base units) --------------------------------------------------------
    def create_lease(self, amount_units: int) -> tuple[int, dict]:
        fn = self.escrow.functions.createLease(self.address("tenant"), Web3.to_checksum_address(self.s.arbiter_address), amount_units)
        tx, receipt = self._send("landlord", fn)
        ev = self.escrow.events.LeaseCreated().process_receipt(receipt)
        if not ev:
            raise chain_error("createLease: no LeaseCreated event in receipt")
        return int(ev[0]["args"]["id"]), tx

    def deposit(self, onchain_id: int, amount_units: int) -> dict:
        self._send("tenant", self.usdc.functions.approve(self.escrow.address, amount_units))
        tx, _ = self._send("tenant", self.escrow.functions.deposit(onchain_id))
        return tx

    def commit_photos(self, onchain_id: int, phase: str, manifest_hash: bytes, role: str) -> dict:
        tx, _ = self._send(role, self.escrow.functions.commitPhotos(onchain_id, PHASES[phase], manifest_hash))
        return tx

    def propose(self, onchain_id: int, deduction_units: int, report_hash: bytes) -> tuple[dict, int]:
        tx, receipt = self._send("landlord", self.escrow.functions.proposeDeductions(onchain_id, deduction_units, report_hash))
        ev = self.escrow.events.DeductionsProposed().process_receipt(receipt)
        deadline = int(ev[0]["args"]["appealDeadline"]) if ev else 0
        return tx, deadline

    def accept(self, onchain_id: int) -> dict:
        tx, _ = self._send("tenant", self.escrow.functions.accept(onchain_id))
        return tx

    def appeal(self, onchain_id: int) -> dict:
        tx, _ = self._send("tenant", self.escrow.functions.appeal(onchain_id))
        return tx
