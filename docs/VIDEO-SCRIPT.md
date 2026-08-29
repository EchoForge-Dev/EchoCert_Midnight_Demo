# EchoCert Midnight — 2 分钟视频分镜（v5，2026-08-29 按成品修订）

**赛道：Integrate Midnight to Upgrade an Existing App**——before = EchoCert on Cardano（真实产品，公开注册表），after = 同一凭证在 Midnight 上只证明一个字段。画面必须出现 BEFORE / AFTER 两个词。

叙事不变：Midnight University 的两个申请人——Chuck（真凭证，选择性披露）与 Charles（没凭证，本地被拒）。Chuck 是 Charles 的昵称，两个角色是同一个人，这是收尾的反转。造假戏 ≤15 秒。

**v5 改了什么**：字幕全部改成克制的工程口吻——只陈述画面上正在发生、且能被核验的事；删掉 "288 bytes"（没测过）、"nothing leaves the device"（不准确：离开设备的是一个 32 字节的哈希，产品现在把它明明白白显示出来）、"refuses to lie" / "checked by math" 这类句子。镜 5/6/7 的画面描述按重做后的产品更新。文末新增**完整字幕稿**，按时间轴排好，剪辑时照抄。

**硬性要求（资格线）**：开头必须报黑客松名称与本人——镜 1 的终端首行 + 字幕双保险。

| # | 时间 | 画面 | 声音 | 字幕 |
|---|---|---|---|---|
| 1 | 0:00–0:04 | 黑屏。终端敲出 `$ echocert demo --for "MLH Midnight Hackathon" --by "Charles Tao"`，ASCII mark 展开，两项自检打勾（proof server · indexer）。**压 4 秒，不恋战** | 键击音，末行一声轻 confirm | **Charles Tao · EchoCert on Midnight · MLH Midnight Hackathon 2026** |
| 2 | 0:04–0:14 | **BEFORE 卡**（Claude Design，已出片）：左上 BEFORE；右半放真实 EchoCert Cardano 产品页截图 | soft 包，几乎无声 | 卡上文字即字幕，不另加：*Midnight University. Two applicants. / Chuck's diploma is already on EchoCert — public on Cardano, verifiable by anyone. / Admissions needs one field. The registry shows everything.* |
| 3 | 0:14–0:22 | **AFTER**：真实录屏，左上 AFTER 标签；凭证五字段全部点开。停在 ANCHOR 行一拍：完整 64 位哈希，下面一行灰字 *same hash as the public EchoCert record on Cardano mainnet · minted 2026-04-11* | 环境静 | "The same credential, now on Midnight." → "ANCHOR is the same hash as its public Cardano record." |
| 4 | 0:22–0:36 | **涂黑选披露**：依次点 SUBJECT、ISSUER、ISSUED_YEAR、ANCHOR，每行碎成 ▮ 块、标注翻成 ○ LOCAL；只留 DEGREE ● DISCLOSED | 每次盖上一声闷响，揭开一声轻响 | "Four fields stay on the device." → "One is selected: DEGREE." |
| 5 | 0:36–0:52 | **PROVE（实时，不剪速，全片最长单镜）**：点击后四行 ▮ 块碎成 ░▒▓ 上飘，面板里展开玻璃字符场，计时器走真实时间；prover 报"证明完成"的一瞬（实测 1–4.5 s，每次不同）字符场凝聚成一行哈希，标签 *SHA256(DEGREE) · WHAT LEAVES THE DEVICE · 32 BYTES* | 处理音每 0.9 s 轻敲 → 凝聚瞬间 success 音 | "Proving on this device." → （凝聚时）"What leaves the device: sha256(DEGREE). 32 bytes." |
| 6 | 0:52–1:02 | **FINALIZE（唯一允许加速的镜头）**：状态 SUBMITTED，提示 *Landing on Midnight*，计时器继续；落链后 ON CHAIN 块——TRANSACTION、CONTRACT、LANDED IN、SIZE 从 0 数到真实字节数、DISCLOSED VALUE ✓ | 落块一声清亮 confirm | "Landing on Midnight (sped up)" + 角标压**这一条 take 屏幕上的** tx 与合约地址前 8 位（不要用别的 take 的）。落定后："On chain: the whole transaction, proof included — the size you see is measured." |
| 7 | 1:02–1:12 | **VERIFY**：左 ✓ VALID + LEARNED / DID NOT LEARN；右侧同屏 RAW INDEXER RESPONSE——真实无钱包查询、真实毫秒、hash / block height / 合约地址高亮 | success 尾音 | "Verified from the transaction alone, by anyone." → "The university learns the degree. Nothing else." |
| 8 | 1:12–1:26 | **造假戏（≤15 秒）**：切到 Charles——点 *Try it with a forged diploma*，DEGREE 变成 PhD Astrophysics；点 PROVE → 约 20 ms 黄色 FAILED，三行说明（REJECTED BY your own device / REACHED THE NETWORK no / WHY） | 一声干脆的 error 音 | "Charles has no diploma. He tries anyway." → "Rejected on his own device in 20 ms. Nothing was sent." |
| 9 | 1:26–1:40 | **三校卡**（Claude Design，已出片）：三列依次 ✓，标题 *None of them can tell.*；可切一段真实录屏的 *Prove to all three* 面板（三笔真实 tx） | 三次 ✓ 各一声 | 卡上文字即字幕（Charles 决定：卡照旧，不重出）。 |
| 9b | 1:40–1:52 | **收尾卡**（Claude Design，已出片）。**不提年龄** | soft 尾音 | 卡上文字：*The forger is real. / He built the system that caught him.*（Charles 决定：卡照旧；旁白用平静的功能口吻承接，见配音稿） |
| 10 | 1:52–2:00 | 页脚：EchoForge lockup · ALL FOR SIMPLE · 三个链接（m.echoforgeef.com · GitHub · the Cardano record） | 静 | "m.echoforgeef.com/echocert · github.com/EchoForge-Dev/EchoCert_Midnight_Demo" |

## 完整字幕稿（按时间轴，剪辑照抄）

| 时间 | 字幕 |
|---|---|
| 0:00 | Charles Tao · EchoCert on Midnight · MLH Midnight Hackathon 2026 |
| 0:04 | （BEFORE 卡自带文字） |
| 0:14 | The same credential, now on Midnight. |
| 0:18 | ANCHOR is the same hash as its public Cardano record. |
| 0:22 | Four fields stay on the device. |
| 0:30 | One is selected: DEGREE. |
| 0:36 | Proving on this device. |
| 凝聚时 | What leaves the device: sha256(DEGREE). 32 bytes. |
| 0:52 | Landing on Midnight (sped up) |
| 落定时 | On chain: the whole transaction, proof included — the size you see is measured. |
| 1:02 | Verified from the transaction alone, by anyone. |
| 1:07 | The university learns the degree. Nothing else. |
| 1:12 | Charles has no diploma. He tries anyway. |
| 1:20 | Rejected on his own device in 20 ms. Nothing was sent. |
| 1:26 | （三校卡自带文字） |
| 1:40 | （收尾卡自带文字） |
| 1:52 | m.echoforgeef.com/echocert · github.com/EchoForge-Dev/EchoCert_Midnight_Demo |

## 配音稿（Charles 本人配音 · 功能讲解，不做宣传）

原则：只解释画面上正在发生的机制，第一人称，短句。约 260 词，按 2.2–2.4 词/秒朗读正好 2 分钟。每镜单独录一条，剪辑时对齐；镜 5 的 "thirty-two bytes" 要落在字符场凝聚的那一瞬。括号里的中文是给自己看的意思对照，不读。

| 镜 | 时间 | 旁白（读这个） |
|---|---|---|
| 1 | 0:00 | I'm Charles Tao. This is EchoCert on Midnight, built for the MLH Midnight Hackathon. （报名，资格线） |
| 2 | 0:04 | EchoCert is my credential registry on Cardano. It works: anyone can verify a diploma. But to check one field, the registry shows all of them. （before：公开注册表，查一个字段得看全部） |
| 3 | 0:14 | On Midnight, the credential stays on the holder's device. The chain holds only a commitment to it — a hash with a secret nonce. The ANCHOR field is the same hash as the public Cardano record. （承诺值上链；ANCHOR 与 Cardano 记录同哈希） |
| 4 | 0:22 | The holder chooses what to prove. Four fields are redacted; they are never sent, not even encrypted. One is selected: the degree. （选择性披露） |
| 5 | 0:36 | Now the device generates a zero-knowledge proof: a credential with this degree is in the registry, shown by a Merkle path against the tree's root, without revealing which entry. The only public input is a hash of the degree — thirty-two bytes. （ZK 证明的内容；唯一公开输入 32 字节） |
| 6 | 0:52 | The proof goes out as a transaction. Landing takes about twenty seconds; this part is sped up. The size you see is the whole transaction, measured from the indexer. （提交与落链；字节数是实测） |
| 7 | 1:02 | Anyone can verify it from the transaction alone — here, a plain query to the public indexer, with no wallet. The university learns the degree, and nothing else. （无钱包验证；只学到一个字段） |
| 8 | 1:12 | And a forged diploma? Its Merkle path doesn't match the forged credential, so the circuit refuses to produce a proof. It fails on the forger's own device in twenty milliseconds. Nothing is sent. （造假在本地被拒） |
| 9 | 1:26 | Three universities, three transactions. They share only what any two holders' proofs share: the contract, the circuit, the tree root. Nothing points back to one person. I measured that; I didn't assume it. （不可关联，实测） |
| 9b | 1:40 | Both applicants were me. I built the public registry on Cardano, and now the private proof on Midnight. Same credential, one new path. （反转，平静地说） |
| 10 | 1:52 | The contract, the demo and every transaction are public. Links on screen. Thank you. （收尾） |

朗读提示：镜 3 和镜 5 最长，如果读不进时长，先删括号外的从句（"a hash with a secret nonce" / "shown by a Merkle path against the tree's root"），别加快语速。

## 60 秒保底版

| 镜 | 秒 | 内容 | 字幕 |
|---|---|---|---|
| 1 | 4 | 终端首行报名 | Charles Tao · EchoCert on Midnight · MLH Midnight Hackathon 2026 |
| 3 | 8 | 凭证五字段，停在 ANCHOR | The same credential, now on Midnight. |
| 4 | 10 | 涂黑到只剩 DEGREE | Four fields stay on the device. One is selected. |
| 5 | 14 | 真实 PROVE 到凝聚 | What leaves the device: sha256(DEGREE). 32 bytes. |
| 7 | 8 | ✓ VALID + 原始响应 | Verified from the transaction alone. |
| 8 | 10 | 造假 → 20 ms 本地拒绝 | Rejected on his own device. Nothing was sent. |
| 10 | 6 | 页脚链接 | m.echoforgeef.com/echocert |

## 原则

- 镜 1 的报名是硬性要求，剪辑时第一件事核对它在。
- 镜 5 必须真实实时——抖动本身就是真实感；页面等 prover 的 proved 事件，绝不写死时长。
- 镜 6 是唯一允许加速的镜头，必须字幕标注 "(sped up)"，且压的 tx / 合约必须来自同一条 take。
- 字幕只说画面上正在发生、且能被核验的事。没测过的数字不上屏。
- 全片不出现年龄数字。
- 全片旁白可以为零。
- 镜 2、9、9b 用文字卡；其余全部真实录屏。

## 依赖清单

- [x] demo 页面 F1–F5，含 PROVE / FINALIZE / VERIFY 三个真实时刻
- [x] 合约 + 管线在公网 preprod 跑通（合约 `76505497…`）
- [x] 录屏链路（OBS + Dipper）
- [x] 音效（Kenney CC0，映射到隐私动作）
- [x] preprod 没有区块浏览器 → 压 indexer 查询（页面上 RUN IT YOURSELF 就是它）
- [x] 主仓库 EchoCert 产品页入口 "Prove privately on Midnight →"（分支 `midnight-entry`，待合并部署）
- [x] 真实 Cardano 锚定哈希进 ANCHOR
- [ ] 提交表单勾选 Integrate 赛道；Devpost 文案在 `docs/DEVPOST.md`
