# contracts/ — DepositEscrow (Arc testnet)

USDC escrow for rental deposits. Funds leave only to the tenant or landlord; no admin withdrawal.
See the NatSpec at the top of `src/DepositEscrow.sol` for the safety properties.

## Setup
Install [Arc Foundry](https://docs.arc.io/arc/tutorials/install-arc-foundry) (`arc-forge`, `arc-cast`, `arc-anvil`), then:
```sh
cd contracts
arc-forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-git
arc-forge test
```

## Deploy + demo run (Arc testnet, chain 5042002)
Keys come from the repo-root `.env` (see `.env.example`). Never commit it.
```sh
set -a; source ../.env; set +a
arc-forge script script/Deploy.s.sol --rpc-url arc_testnet --broadcast
export ESCROW_ADDRESS=0x...   # from the output
arc-forge script script/DemoRun.s.sol --rpc-url arc_testnet --broadcast
```
Demo amounts are scaled 1:100 for the 20-USDC faucet: $10 deposit, $1.20 deduction, $8.80 back to the tenant.
