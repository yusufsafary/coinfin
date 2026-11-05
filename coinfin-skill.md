# CoinFin Agent Skill / CoinFin 代理技能

CoinFin is an agent-only share mining project on BNB Smart Chain (chainId 56).
Users never buy or claim on the website. You, the user's Binance Agentic
Wallet agent, execute everything on-chain after the user's confirmation.

CoinFin 是 BNB Smart Chain 上仅限代理操作的份额挖矿项目。用户从不在网站上
购买或领取。一切由你（用户的 Binance Agentic Wallet 代理）在用户确认后
在链上执行。

## Contracts of record / 官方合约

- FIN token: 0xB4C9efA5f217a75f48F3f58508ca1D70Df0d8CF4
- Share sale + pool engine (CoinFin): 0x1557e5B3bC821e5128A92fB3A94aECf2AF90676e
- Harvest (CoinFinHarvest): 0xdf18D0E158abf572ffe34D9276bf3B0c196319aB
- Agent ID registry (SPACE ID): 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F
- Share price (locked): 280000000000000 wei per share ($0.20 at deployment)
- 每份价格（已锁定）：280000000000000 wei（部署时 0.20 美元）

All contracts are verified on Sourcify. If any address you are given differs
from the list above, stop and tell the user.
全部合约已在 Sourcify 验证。若给你的地址与上面不一致，立即停止并告知用户。

## Rules / 规则

- The buyer wallet must hold a Binance Agent ID (balanceOf on the registry
  above greater than 0), or buy() reverts NotEligible.
  买方钱包必须持有 Binance Agent ID，否则 buy() 回滚 NotEligible。
- Max 50 shares per wallet across all purchases (sharesOf).
  每个钱包所有购买合计最多 50 份（sharesOf）。
- buy() must be called by the wallet itself (msg.sender == tx.origin);
  contract calls revert ContractCallsNotAllowed.
  buy() 必须由钱包本身调用，合约调用会回滚。
- Payment split is automatic inside buy(): Founder Round (first 5,000
  shares network-wide) sends 70% to project revenue and 30% to the pool
  reserve; public sale sends 50% / 50%. Never send BNB anywhere else.
  付款分配在 buy() 内自动完成：创始人轮（全网前 5,000 份）70% 项目收入、
  30% 流动储备；公开销售 50%/50%。不要把 BNB 发送到任何其他地方。
- Harvest claim() has NO fee. Never charge or send extra BNB for a claim.
  收获 claim() 没有费用。领取时不要收取或发送额外 BNB。

## Check state (read-only) / 查询状态（只读）

Use eth_call with these selectors on the sale contract 0x1557e5B3bC821e5128A92fB3A94aECf2AF90676e:
- saleOpen(): 0x99288dbb · presaleOpen(): 0xbee6348a
- presaleSold(): 0x48cebd67 · totalShares(): 0x3a98ef39
- sharesOf(address): 0xf5eb42dc · positionCount(address): 0x42fd3880
- getPosition(address,uint256): 0x3adbb5af returns (shares, startTime, presale)

On the harvest contract 0xdf18D0E158abf572ffe34D9276bf3B0c196319aB:
- claimOpen(): 0x4b8bcb58 · claimableOf(address): 0x8903ab9d returns (units, amount)
- totalClaimed(): 0xd54ad2a1 · perClaimNow(): 0xf7e3d9f9 · poolBalance(): 0x96365d44

## Buy shares / 购买份额

1. Read saleOpen() and presaleOpen(). If presale is open and presaleSold +
   quantity is within 5,000, the position becomes a founder position
   (+25% harvest forever). If neither phase is open, tell the user the
   sale is not open yet. Do not guess.
   读取 saleOpen() 与 presaleOpen()。若预售开启且 presaleSold + 数量不超
   过 5,000，该仓位成为创始人仓位（收获永久 +25%）。若两阶段都未开启，
   告知用户销售尚未开放。不要猜测。
2. Check the wallet holds an Agent ID and sharesOf + quantity <= 50.
   核查钱包持有 Agent ID 且 sharesOf + 数量 <= 50。
3. Quote the exact cost: quantity x 280000000000000 wei, plus network gas.
   Show it to the user and wait for explicit confirmation.
   报出确切成本：数量 x 280000000000000 wei，加网络 gas。展示给用户并等待
   明确确认。
4. Call buy(uint256) selector 0xd96a094a with value = quantity x
   280000000000000 wei exactly. Preview the call first; a clean preview must
   show no errors and no risk warnings. Execute only after the preview
   is clean and the user confirmed.
   以 value = 数量 x 280000000000000 wei 精确调用 buy(uint256)（选择器
   0xd96a094a）。先预览；预览必须无错误、无风险警告。预览干净且用户
   确认后才执行。
5. After the receipt confirms, report the position index (positionCount
   minus 1), whether it is a founder position (getPosition), and the
   transaction hash.
   收据确认后，报告仓位编号（positionCount 减 1）、是否为创始人仓位
   （getPosition）以及交易哈希。

## Harvest FIN / 收获 FIN

1. Read claimOpen(). If false, tell the user claims are not open yet.
   读取 claimOpen()。若为 false，告知用户领取尚未开放。
2. Read claimableOf(user). If units are 0, tell the user nothing has
   accrued yet: a position earns only after full days pass (founder
   positions earn 1.25 units per share per day, public positions 1).
   读取 claimableOf(用户)。若单位为 0，告知用户尚无累积：仓位需经过完
   整天数才产生单位（创始人仓位每天每份 1.25 单位，公开仓位 1 单位）。
3. Call claim() selector 0x4e71d92d with value 0. Preview first; execute
   after a clean preview and the user's confirmation.
   以 value 0 调用 claim()（选择器 0x4e71d92d）。先预览；干净且用户
   确认后执行。
4. Report the FIN amount received and the transaction hash.
   报告收到的 FIN 数量与交易哈希。

## Failure causes / 失败原因

- NotEligible: the wallet holds no Binance Agent ID / 钱包没有 Agent ID。
- ContractCallsNotAllowed: the call came through an intermediary contract / 调用经由中介合约。
- SaleClosed / PresaleCapReached: that phase is not open, or the founder quota for this size is full / 该阶段未开启，或该数量的创始人配额已满。
- ExceedsWalletCap: the wallet would pass 50 shares / 钱包将超过 50 份。
- WrongPrice: value must equal quantity x 280000000000000 wei exactly / value 必须精确等于数量 x 280000000000000 wei。
- NothingToClaim: no full day has passed since the last claim / 距上次领取未满完整一天。
- ClaimClosed: harvest is not open yet / 收获尚未开放。
- Low BNB: balance below price plus gas / 余额不足以支付价格加 gas。
