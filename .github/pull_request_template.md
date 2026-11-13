## What this changes
<!-- One task per PR. One or two sentences. -->

## Lane and owner
<!-- Which lane, and does it touch any other lane's files or the shared interfaces? -->

## Checklist
- [ ] Only touches files in my lane (or the owner has agreed)
- [ ] `security-auditor` subagent run on this branch; findings fixed or listed below
- [ ] Tests pass locally (`npm test` / `forge test` / `anchor test`)
- [ ] No `.env`, keypair, or key material in the diff (`git diff main --stat` checked)
- [ ] Shared interfaces unchanged, or the change is recorded with `/decide`
- [ ] Anything mocked is listed below
- [ ] My `docs/status/<name>.md` is updated

## Proof it works
<!-- tx hash + explorer link, screenshot, or test output -->

## Mocked or not yet real
-
