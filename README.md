# vocabullary · 背单词

一个单文件的英语背单词应用。打开 `index.html` 就能用，不需要安装、不需要构建、不需要联网（发音与语音识别除外）。

内置五本考试词书共 **10637 个词**，带规范 IPA 音标、英文释义、真实语料例句；配艾宾浩斯复习排期、三档自评、选择题测验、高频错词库、跟读评分和统计。

## 功能

- **学习流程（新）**：一个词当天要「连续答对」才算过——普通词 2 次，闪过模糊/不认识的词 3 次。答对但次数不够时，卡片会隔几张再回来：不认识隔 3 张、模糊隔 6 张、认识隔 10 张。答对次数够了就毕业，当天不再出现。
- **两套间隔阶梯**：毕业后的复习节点，认识过的走 `1、2、4、7、15、30、60、120` 天；闪过模糊/不认识的走更密的 `0.5、1、2、3、5、10、20、40` 天，复现频率明显更高。
- **每天词数自定义**：任意填 1–500，另有 10/20/30/50/100 快捷档，**按词书独立计算**。
- **可撤销评分**：点「认识」后 3.5 秒内可点提示条上的「撤销」（或 `Ctrl/Cmd + Z`），排期与今日计数一起回滚。
- **高频错词库**：同一个词累计答错 **3 次**自动收录，也可以在单词卡上手动「＋ 加入错词库」。入库后**不会自动移除**——答对、清空进度、换词书都不会删，只能在错词库页面手动删。
- **跟读评分**：**真人录音**（不是 TTS），句子按 四级/六级/考研/雅思/托福 分级可筛。跟读一遍后按词给出绿/黑/红三档判定，可循环播放、慢速、点单词单独听发音。
- **选择题测验**：从练过的词抽 10 个，中英双向，四选一。
- **统计**：当前词书已学 / 已掌握 / 连续打卡 / 全部词书累计，最近 7 天柱状图，各词书进度条。
- **自定义词表**：粘贴导入，逐条删除或全部清空。
- **深色模式**：跟随系统；文字对比度全部达到 WCAG AA（最低 4.51:1）。

## 使用

```bash
# 方式一：直接双击
index.html

# 方式二：本地静态服务（file:// 下部分浏览器的语音识别不可用，推荐这种）
python -m http.server 8000
# 打开 http://127.0.0.1:8000/
```

> **跟读功能需要 Chrome 或 Edge**（依赖 `webkitSpeechRecognition`）。Safari / Firefox 不支持时会给出提示，其余功能不受影响。麦克风需要 HTTPS 或 `localhost`。

## 内置词书

| 词书 | 词数 | 音标 | 例句 |
|---|---|---|---|
| 四级词汇 CET-4 | 3842 | IPA | 有 |
| 六级词汇 CET-6 | 5401 | IPA | 有 |
| 考研词汇 | 4800 | IPA | 有 |
| 托福词汇 TOEFL | 6952 | IPA | 有 |
| 雅思词汇 IELTS | 5019 | IPA | 有 |

五本词书按考试标签切分，同一个词可以同时属于多本；总计去重 **10637** 个词。音标覆盖 99.8%，例句覆盖 96.6%（其余为语料中确实缺少合适句子）。

## 数据来源与授权

| 用途 | 来源 | 授权 |
|---|---|---|
| 英文释义、考试标签、柯林斯星级、词频、牛津 3000 标记 | [ECDICT](https://github.com/skywind3000/ECDICT) | MIT（聚合自 stardict 等来源） |
| 音标（ARPAbet → IPA 转写） | [CMU Pronouncing Dictionary](https://github.com/cmusphinx/cmudict) | 类 BSD |
| 例句、跟读长难句 | [Tatoeba](https://tatoeba.org) | CC BY 2.0 FR |
| 跟读的真人录音 | Tatoeba 社区志愿者录制（`audio.tatoeba.org`），每条标注说话人 | CC BY 2.0 FR |

`index.html` 里的 `WORDS_RAW` 与 `READ_RAW` 两段是由脚本生成的内联数据，**不要手动改**。

释义为英文，未提供中文翻译。外链指向 [Oxford Learner's Dictionaries](https://www.oxfordlearnersdictionaries.com/)，仅作跳转，不嵌入其内容。

## 词条格式

内置词库是 9 字段竖线格式：

```
单词|音标|释义|例句|词性|考试标签|柯林斯星级|牛津3000|词频
abandon|/əˈbændən/|the trait of lacking restraint...; forsake, leave behind|The girl had to abandon the idea of becoming a singer.|n.|cet4 cet6 ky toefl|3|1|2182
```

自定义词表沿用简化的 5 字段写法：

```
abandon|/əˈbændən/|to leave somebody for ever|They had to abandon the plan.|v.
```

只有「单词」和「释义」必填；也支持 `abandon to leave somebody for ever`（空格或逗号分隔）。

## 数据存储

- 全部状态在 `localStorage` 的 `dsword.v1` 下：设置、自定义词表、错词库、错词计数、自定义跟读句子、每个词的学习进度、每日记录、连续天数。
- **没有云端同步，也没有导出功能**，清浏览器数据会丢全部进度。
- 设置里可「清空当前词书进度」或「清空我的词表」，均不可恢复；错词库只能逐条或整体手动清空。

## 实现说明

整个应用是一个 `index.html`（约 2.0 MB）：CSS + 13 行 HTML 骨架 + 内联词库数据 + 约 1300 行逻辑，逻辑由一个立即执行函数封装。

没有框架、没有构建步骤、没有运行时依赖。改完直接刷新页面即可。

```js
const IV       = [0,1,2,4,7,15,30,60,120];   // 认识的词走的间隔（天）
const IV_FUZZY = [0,0.5,1,2,3,5,10,20,40];    // 闪过模糊/不认识的词走更密的档
const GAP_FAIL = 3, GAP_FUZZY = 6, GAP_KNOW = 10;  // 同一轮里隔几张卡再出现
const NEED_SOLID = 2, NEED_FUZZY = 3;         // 连续答对几次算过
const MASTER = 4;                             // s >= 4 视为已掌握
const WRONG_HIT = 3;                          // 累计答错几次自动进错词库
const STORE = 'dsword.v1';                    // localStorage 键名
```

## 数据重建

```bash
# 1. 取三份原始数据
#    ecdict.csv             https://github.com/skywind3000/ECDICT                          (63 MB)
#    cmudict.dict           https://github.com/cmusphinx/cmudict                           (3.5 MB)
#    eng_sentences.tsv.bz2  https://downloads.tatoeba.org/exports/per_language/eng/        (24 MB)
# 2. 生成词库与语料
python build.py          # 产出 words_blob.txt / reading_blob.txt / stats.json
# 3. 注入 index.html（替换 WORDS_RAW 与 READ_RAW 两段）
python inject.py
```

`build_audio.py` 单独生成跟读语料：从 Tatoeba 里筛出**带真人录音**的英文句子，按整句词汇的考试级别打难度标签，每个说话人最多取 3 条以保证音色多样，并过滤敏感题材与专有名词。

`build.py` 做的事：按 `cet4/cet6/ky/toefl/ielts` 标签筛词 → 用 CMUdict 生成 IPA（含重音标记）→ 清洗 WordNet 风格释义（合并折行、剥词性前缀、统一引号）→ 用 Tatoeba 为每个词挑一条 6–18 词、尽量无专有名词的例句 → 挑 40 条 14–34 词的长难句做跟读素材。

## License

[MIT](LICENSE)

内置词库数据来自上述第三方来源，其授权（MIT / BSD / CC BY 2.0 FR）独立于本项目代码。
