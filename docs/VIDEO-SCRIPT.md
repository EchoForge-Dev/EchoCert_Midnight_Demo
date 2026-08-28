# EchoCert Midnight — 2 分钟视频分镜（v4，2026-08-26 锁定赛道）

**赛道：Integrate Midnight to Upgrade an Existing App**——before = EchoCert on Cardano（真实产品，公开注册表），after = 同一凭证在 Midnight 上只证明一个字段。画面必须出现 BEFORE / AFTER 两个词。

单一世界叙事：**两个申请人闯 Midnight University**——Chuck（正面：真凭证 + 选择性披露）与 Charles（反面：没文凭，造假被自己系统抓住）。Chuck 是 Charles 的昵称——同一个名字的两种选择，这是彩蛋。造假戏份 ≤15 秒，Chuck 的正面流程占大头。
旁白极少，音效当主角（uisfx，mechanical/glass 主包）。字幕 EN 主。真实录屏做血肉，Claude Design 做片头/字幕卡/压屏。
录屏前确认系统声音进音轨（macOS 15+ 自带录屏或 OBS+BlackHole，赛前已验证的方案为准）。

**硬性要求（资格线）**：开头必须报黑客松名称与本人——镜 1 的终端首行 + 字幕双保险，不为美学赌这一条。

| # | 时间 | 画面 | 声音 | 字幕/旁白 |
|---|---|---|---|---|
| 1 | 0:00–0:04 | 黑屏。终端首行敲出 `$ echocert demo --for "MLH Midnight Hackathon" --by "Charles Tao"`，随后 ASCII logo 快速展开 + 两行自检（proof server ✓ / midnight ✓）。**压 4 秒，不恋战** | 键击音，末行一声轻 confirm | 压屏字幕："**Charles Tao · EchoCert Midnight · demo for the MLH Midnight Hackathon**" |
| 2 | 0:04–0:14 | **钩子 = BEFORE**。文字卡（Claude Design）：左上角标 **BEFORE**；真实的 EchoCert Cardano 产品页/凭证截图，五字段全公开 | soft 包，几乎无声 | "Midnight University. Two applicants." → "Chuck's diploma is already on EchoCert — **public on Cardano, verifiable by anyone.**" → "Admissions needs one field. **The registry shows everything.**" |
| 3 | 0:14–0:22 | **AFTER**。切入真实录屏，左上角标 **AFTER**：同一张凭证五字段完整可见。SUBJECT: Chuck；ISSUER: **中性虚构校名**（建议 "Meridian Institute of Technology"，绝不用真实学校，也不用自家品牌）；**ANCHOR 字段 = Cardano EchoCert 上那条真实锚定哈希**（before 的产物嵌进 after 的凭证，两条线在此握手）；Stickman Charles 彩蛋改放 SUBJECT 的 DID：`did:echo:stickman-charles/chuck`（下一镜被涂黑） | 环境静 | "**Same credential. Now on Midnight.**" |
| 4 | 0:22–0:36 | **涂黑选披露**：光标逐个把字段盖上黑条，只留 DEGREE。隐私标注 ○/◐/● 随动 | 每次盖上一声闷响（toggle），揭开一声轻响 | "He reveals the one field they need. The rest stays home." |
| 5 | 0:36–0:52 | **PROVE（实时，不剪速，全片最长的单镜）**：点击后被隐藏字段碎裂成 ░▒▓ 飘进 ASCII 场，1–4.5 秒后凝聚成 proof hash；留足呼吸，让抖动被看见 | processing 循环音起 → 凝聚瞬间 success 音 | "Proving locally… nothing leaves the device." → "288 bytes." |
| 6 | 0:52–1:02 | **FINALIZE（压缩）**：链上面板字节计数 0→32→288 跳动，tx 落块打勾。加速/跳剪，字幕注明；**画面压 tx hash + 合约地址**（有区块浏览器就压 URL，没有就压 indexer 查询语句），让人能自己去查 | 落块时一声清亮的 confirm（● PUBLIC 音色） | "Landing on Midnight (sped up)" + 角标 `tx 00b2c3…b853 · contract ec4e17…96e2`（比赛当天换成真实值） |
| 7 | 1:02–1:12 | **VERIFY**：✓ VALID 绿字，Chuck 录取；右侧同屏展示**无钱包 indexer 原始响应**（真实 4 ms 的那次查询）——未加速的上链证据 | success 尾音 | "Midnight University learns: the diploma is real. **Nothing else.**" |
| 8 | 1:12–1:26 | **造假戏（≤15 秒）**：切换角色——Charles 的"凭证"出现，字段可疑地完美。点 PROVE → **20ms 红色 ✗，本地拒绝，请求未出网** | 一声干脆的 error 音 | "Charles has no diploma. So he made one." → "**His own device refuses to lie.**（20 ms）" |
| 9 | 1:26–1:40 | **不可关联 + 商业价值**：三所大学（Midnight University，Cardano University，EchoForge University）并排，Chuck 的三次证明之间画不出连线 | 无 | "Chuck applied to two other universities too. **None of them can tell.**" → "**EchoCert on Cardano is the public registry. EchoCert on Midnight is the private proof.**" → "**Same product. One new line. 288 bytes, checked by math — and it can't be used to track who applied where.**" |
| 9b | 1:40–1:52 | **收尾**：黑屏文字卡。**不提年龄**——年龄放 README，不当情绪落点 | soft 尾音 | "The forger is real." → "**He built the system that caught him.**" |
| 10 | 1:52–2:00 | EchoForge lockup + 一切为简 · ALL FOR SIMPLE + repo 与 live demo URL 压屏 | 静 | m.echoforgeef.com · GitHub |

## 60 秒保底版（先做死这个，再谈加分项）

周日中午前必须已经能交的版本，不含任何动画、文字卡、音色映射：

| 镜 | 秒 | 内容 |
|---|---|---|
| 1 | 4 | 终端首行报名 + 字幕（资格线） |
| 3 | 8 | 凭证五字段 |
| 4 | 12 | 涂黑选披露（纯 UI，无音效也可） |
| 5 | 14 | 真实 PROVE（哪怕只是一个 loading 态 + proof hash 出现） |
| 7 | 8 | ✓ VALID + tx hash 压屏 |
| 8 | 8 | Charles 造假 → 本地拒绝 |
| 10 | 6 | 链接压屏 |

保底版只依赖 F2–F5 的最简实现。加分项按性价比排序：① 镜 9 商业价值句（零工程量）→ ② 镜 2 钩子卡 → ③ 镜 5 ASCII 碎裂动画 → ④ 音效 → ⑤ 镜 6 FINALIZE 面板 → ⑥ 三级隐私音色映射 → ⑦ 镜 1 ASCII logo 敲字。来不及就从 ⑦ 往前砍。

## 原则

- 镜 1 的报名是硬性要求，剪辑时第一件事核对它在。
- 镜 5 的 proving 必须真实实时——抖动本身就是真实感；动画等 promise resolve，绝不写死时长。
- 镜 6 是唯一允许加速的镜头，必须字幕标注 "(sped up)"，且必须压可核验的 tx hash / 地址——可核验比不加速更有说服力。
- 全片不出现年龄数字。
- 全片旁白可以为零：字幕 + 音效足够。若配音，只配镜 2 和镜 9 各一句。
- 镜 2、9、9b 的文字卡由 Claude Design 制作；其余全部真实录屏。
- 每完成一段功能就录素材；视频最后剪，不最后录。

## 依赖清单（拍摄前置）

- [ ] demo 页面完成 F1–F5（比赛期间构建；保底版只要 F2–F5 最简实现）
- [x] v2 合约 devnet E2E 通过
- [ ] 录屏链路验证（系统声音进音轨）
- [ ] uisfx 音色包定稿 + 三级隐私音色映射（加分项 ⑥）
- [ ] 比赛日确认 preprod 有无区块浏览器；没有就压 indexer 查询
- [ ] **主仓库 EchoCert Cardano 产品页加一行入口 "Prove privately on Midnight →"**（比赛期间加，让集成是看得见的，不是独立 demo 站）
- [ ] 取一条真实的 Cardano EchoCert 锚定哈希填进 ANCHOR 字段
- [ ] 提交表单里明确勾选 Integrate 赛道；README 首屏放 BEFORE/AFTER 对照图（复用 .dc.html "THE TWO LINES" 那节）
