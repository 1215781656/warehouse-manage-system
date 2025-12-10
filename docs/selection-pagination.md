# 菜单分页与选择标准方案

## 分页
- 每页数量可配置：`pageSizes=[10,20,50,100]`，`pageSize` 可持久化（视页面需要）
- 页码导航：Element Plus `el-pagination` 布局 `total, sizes, prev, pager, next, jumper`
- 跳转页码：启用 `jumper`
- 显示当前页与总数：`total`、`current-page`

## 选择
- 选择列：`<el-table-column type="selection" :selectable="rowSelectable" />`
- 明确可视化：表头显示“已选：X 条”
- 选中状态维护：全局 `selectedKeys: Set` 记录跨页选择
- 保留勾选：表格开启 `:reserve-selection="true"` 并在翻页后 `restoreSelection()`

## 全选
- 表头“全选”勾选框：`selectAll` 控制
- 当前页全选/取消全选：程序化切换行选中，期间屏蔽 `selection-change`
- 跨页全选：`selectAll=true` 时，翻页后自动选中当前页全部；用户取消当前页任意一项自动取消全选

## 统一逻辑要点
- 屏蔽事件：`suppressSelectionEvent` 防止程序化勾选与回调互相干扰
- 恢复显示：翻页、数据加载、筛选变化后调用 `restoreSelection()`
- 计数反馈：`selectionCount` 在全选下显示为总数，其余显示为集合大小

