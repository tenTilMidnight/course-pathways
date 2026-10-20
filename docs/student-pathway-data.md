# 学生 pathway 数据：第一版结构与 Grace 审阅版

学生最少只需提供「学校 + 专业背景 + 按学期排列的课程代码」，就能生成一条可浏览的 pathway。Grace 的 `notes/data/grace.md` 已满足这个起点。课程目录信息由平台补全；个人经历必须由学生提供，不能从课程简介推断。

## 建议向学生收集什么

| 层次 | 第一版需要 | 可选补充 |
| --- | --- | --- |
| 学生背景 | 学校、专业、毕业年份；在读时明确填写年级 | 昵称、concentration、double major、dual degree、minors、职业方向/职位、公司 |
| 每次修课 | 课程代码、学期、修读状态 | 实际 units、mini/section、老师、成绩、是否转学分/重修 |
| 个人体验 | 不是导入的硬性门槛 | 选课原因、收获、建议、项目；哪些已修课程帮助了这门课，以及具体帮助 |
| 数据范围 | 是否完整；哪些学期暂未分享 | 转学经历、休学或其他需要解释时间线的背景 |
| 展示设置 | 哪些字段可以公开 | 隐藏成绩、匿名展示、仅本人预览 |

状态建议使用 `planned / enrolled / completed / withdrawn / not_shared`。过去的日期不自动代表完成，`completed` 也不自动代表通过或获得全部 units。成绩不是必要字段，不要求 GPA、学号或其他身份材料。

对这个产品最有价值的补充是「为什么选、实际学到了什么、对后续哪门课有帮助」。这些个人信息让 pathway 比单纯的课程清单更有用；无需为了填满卡片要求学生写每门课的长评。

## 平台内部如何保存

保持六类记录独立，不把所有内容重复塞进学生的每门课里：

1. **Profile**：稳定 student ID、学校、专业与方向、毕业年份、明确填写的年级、职业信息、公开范围。未提供用 `null`，不按毕业年份倒推年级。
2. **Course**：学校命名空间下的课程 ID、课程代码、官方名称、简介、目录 units。当前版本和历史版本要可区分；跨校或课程改号不能仅按名称合并。
3. **Offering**：某学期实际开设的课程版本、section、老师、mini、当期 units。现在没有可靠的 offering 数据时留空，不能用目录“通常 Fall 开”代替当期事实。
4. **Enrollment**：一个学生的一次修课。关联 course/offering，记录实际学期、状态、实际 units、成绩和 note。重修必须有不同 enrollment ID，不能用课程代码覆盖前一次。
5. **Relationship / rule**：官方先修规则、个人学习帮助、学位 requirement 映射分开建模，详见下节。
6. **Source**：来源类型、URL/原始文件、目录版本、查询日期、核实范围。每条导入或补全记录关联来源；学生纠正信息时保留覆盖依据。

当前实现包含 Profile、Course、Enrollment、CourseRule、Source；Offering 暂不创建虚构记录。学生信息与课程目录分开，实际 enrolledUnits 暂为空。页面显示 catalogUnits，来源及待确认项保存在可展开的资料区，不再添加 current catalog 文案，不汇总为已获学分。

### 一次修课的最小记录

```json
{
  "id": "grace-2026-spring-17-313",
  "studentId": "grace",
  "courseId": "cmu-17-313",
  "term": { "season": "Spring", "year": 2026 },
  "status": "not_shared",
  "enrolledUnits": null,
  "grade": null,
  "note": null,
  "sourceId": "student"
}
```

实际收集时无需学生手写 JSON。按学期写课程代码，或填写每行一门课的表格即可；平台将它们转换成上述结构。建议表格列：`term, course_code, status, actual_units, note, helpful_prior_courses`。后面三列可以先空着。

## 三种关系不能混在一起

| 类型 | 依据 | 可以表达什么 |
| --- | --- | --- |
| 官方 prerequisite rule | 对应版本的官方目录 | `allOf` / `anyOf`、最低成绩、corequisite、推荐背景等；不同约束分别保存 |
| 目录先修匹配 | 规则中的课程代码与学生更早的修课记录匹配 | 仅说明有对应记录，不证明通过、符合当期政策或满足整套先修要求 |
| 学生的 learning connection | 学生本人填写 | 某次修课如何帮助后续某次修课；可以超出学校规定的 prerequisite |

Requirement fulfillment 另外保存：适用的学位/目录版本、requirement ID、对应 enrollment、审核/自报状态、依据。同一门课可能有多个可能用途；没有 degree audit 或明确确认时，不标成已经 fulfill。

正式的 prerequisite expression 必须保留 AND/OR 结构，不能把每个备选都画成必修。没有找到条目应标 `not_listed_in_consulted_source`，不能写“没有先修课”。

## Grace 第一版有哪些内容

- 原始来源：`../notes/data/grace.md`；2026-10-20 按你的确认补充年级和职业方向，并用【】标注；课程历史未改动。
- 背景：Information Systems、concentration in AI Management、minor in Philosophy、Junior (Class of 2028)、Exploring Product Management。
- Fall 2025：5 门；Spring 2026：6 门；Fall 2026：7 门，共 18 条修课记录。
- CMU 从 Sophomore 开始：Fall 2025 / Spring 2026 为 Sophomore，Fall 2026 为 Junior。Connection 页新增 Freshman / Transfer credits 阶段，未出现的必要先修背景按本人指示假定由转学分覆盖。
- 显示名 Grace 来自文件标识，待确认是否用作公开昵称；年级与职业方向已由本人确认，完成状态、实际 units、成绩和 notes 未填写。
- 18 门课均匹配 CMU 官方课程页。简介使用官方逐字短摘录（标记 `official_excerpt`，截断时显示省略号），移除生成式概述。每门课保存独立来源 URL、核查日期、原文哈希；完整描述由 Course detail 中的官方来源链接提供。
- 本地审阅页：`http://127.0.0.1:4175/?view=pathway-review&id=grace`。依次支持 Timeline / Overview 两种 layout；另有课程信息预览、来源与待确认事项、下载 JSON。
- Overview 是所有 pathway 的第二个 layout，先按学期紧凑展示全部课程，再点击展开关系图。Grace 地址为 `http://127.0.0.1:4175/?view=pathway-review&id=grace&timeLayout=connections`；旧 `connection-review` 和 By year 地址均进入这个 layout。节点切换完整链条、浮动信息及模糊背景交互均保留，退出时清理动画、事件监听和尺寸监听。共享渲染模块可用于公开演示，Grace 的个人数据仍从公开构建中排除。
- 预览中的 View course details 始终打开站内详情，例如 `?view=course-review&mode=courses&id=cmu-15-122`。详情包含官方原文短摘录、官方来源、已查到的先修条件，以及 Grace 的 pathway 卡片；不混入演示课程数据。
- `src/local-grace-data.js` 是当前可编辑数据源，`src/local-pathway-model.js` 是转换与匹配逻辑；前缀 `local-` 的模块和本地路由均从公开网站构建中排除。

### 验收时优先确认

1. 18 个课程代码和所属学期是否正确，官方课程名称是否对应你修读的课。
2. 21-241 的实际 units。当前数学课程页列为 11；这不直接证明 Spring 2026 的实际修读 units。其他课也暂使用当前目录值。[CMU 数学课程目录](https://coursecatalog.web.cmu.edu/schools-colleges/melloncollegeofscience/departmentofmathematicalsciences/courses/)
3. 过去课程是否完成，以及 Fall 2026 各门课的状态和 mini 信息。
4. 是否愿意为几门关键课程添加一两句真实 note；尤其是「哪门前面的课帮助了它」。
5. 对这份历史的公开范围与显示名如何填写。

官方规则支持的早期记录匹配为 `15-122 → 17-313`、`15-122 → 07-280`、`21-241 → 07-280`。15-122 和 05-391 / 67-262 同在 Fall 2025，不画成“先上完再修”的箭头。[CMU SCS 目录](https://coursecatalog.web.cmu.edu/schools-colleges/schoolofcomputerscience/courses/)，[CMU IS 目录](https://coursecatalog.web.cmu.edu/schools-colleges/dietrichcollegeofhumanitiesandsocialsciences/informationsystems/courses/)

2026-10-20 追加核实：`36-225 → 07-280` 是 **corequisite match**。07-280 的 Fall 2026 官网将 Probability 和 Calc 2 列为 corequisite；官方 syllabus v1 列出 36-225 等概率课程选项与 21-122。Grace 的 36-225 在 Fall 2025，因此可作为更早修读的背景显示。该关系保存为 `catalog_corequisite_match`，来源独立记录，课程详情在 Corequisites 中呈现，不混入 prerequisite 表达式。若同学期修读，保存匹配但不画成先后箭头；未提供的 corequisite 不据此虚构 enrollment。07-380 也将 36-225 列为先修选项，但未出现在 Grace 的历史中，不增加到她的 pathway。[07-280 Fall 2026](https://www.cs.cmu.edu/~07280/) · [官方 syllabus](https://www.cs.cmu.edu/~07280/07280_syllabus_v1.pdf) · [07-380](https://www.cs.cmu.edu/~07380/)

### Freshman 转学分的表示

转学分假设单独保存在 `transferAssumptions`，不增加到 18 条实际 Enrollment 中。每条包含 `kind: assumed_transfer_background`、本人指示来源、目标 enrollment 和未覆盖的先修表达式。确切等效课程 ID、实际 units 留空；没有虚构外校课程名或 Fall/Spring 学期。

目前产生三个背景组，共五条转学分连接：Programming foundations → 15-122 / 67-262 / 05-391；Calculus foundations → 36-225；Discrete mathematics → 07-280。加上三个 prerequisite 匹配和一个 corequisite 匹配，共九条关系。转学分节点可点击查看对应条件，OR 选项仍是 OR，不表示每门备选都修过。21-241 的推荐背景继续与正式先修分开，不新增为必需转学分。

`src/local-connections.js` 负责缺失先修背景、连接视图和下载数据，`src/local-official-courses.js` 保存官方摘录；所有 `local-` 文件及个人数据路由从公开构建中排除。

### 描述与 Connection 布局

课程描述不再显示 “Official description · excerpt” 这类说明标签。Timeline 简介利用课程另一侧的可用宽度，最大 760px；关系图先为正文分配一栏，最大 720px。正文保留段落，不再限制预览行数，超过屏幕高度时在介绍内滚动。预览里的先修和共修条件默认收起为小型入口，展开后每个 AND 必需组单独编号成行，组内 OR 选项保持在一起；这些辅助信息采用比简介更紧凑的字号和行距，界面省略 minimum grade；原始数据和下载记录仍保留成绩条件。未查到的信息不补占位文字。View course details 始终指向内部课程详情。详情页同样不截断 `fullDescription`，官方来源链接继续保留。

截至本轮，完整官方描述尚未取得可转载来源，当前数据仍是已有短摘录。获得用户提供的完整原文后，可填写 `src/local-official-courses.js` 每门课的 `fullDescription`；适配器会原样传递，详情页无需额外改动。不能把“支持全文显示”当作“已经接入全文”。

图形布局只依据课程节点、依赖层级和时间顺序：同一前置课程的后续分支作为一组对齐到该前置课程，多分支的列在保持时间顺序和节点间距的同时控制总高度。例如 17-313 与 07-280 的整体中心对齐 15-122，不对齐整张图的中心。默认桌面布局先为右侧介绍预留至少 320px，再在左侧空间排图；保留节点文字大小和 178px 卡片宽度，收紧列间距、行间距及内边距。宽度不足以容纳横向依赖层级时，图内改为从上向下推进，介绍仍在旁边。可用区域低于 760px 时再允许介绍移到下方。关系图保持清晰时间方向，简介长度不影响分支对齐。展开条件时只更新阅读卡片及容器高度，课程节点保持原位；窄屏阅读卡片放在图下方，避免展开后覆盖课程。

较短的先修分支向后对齐到其直接后续课程的前一列，减少跨列绕行。每条箭头有独立端口和线路，禁止重合或间距过小的平行线段，保留完整连接；课程卡片上的真实学期不随布局改变。

资料初次查询日期为 2026-10-19；独立课程条目与描述于 2026-10-20 核查。课程目录标为 2026–2027；94-829 使用 Heinz 的官方课程页，该页未标适用学年。它们是补全参考，不冒充各历史学期的 syllabus 或注册记录。每门课的具体来源已在本地审阅页和下载数据中保留。[94-829 官方页面](https://www.heinz.cmu.edu/current-students/courses/94-829/)
