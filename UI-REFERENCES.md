# IoLink 界面参考调研

调研结论：首版应以“池塘”为业务主对象，以“养殖场 → 池塘 → 设备”为资产层级；首页组合 KPI、池塘状态墙和未处理报警。不要先加入投喂、库存、成本或远程控制等后端尚未支持的空壳功能。

## 可借鉴的产品

1. [ThingsBoard Dashboards](https://thingsboard.io/docs/user-guide/dashboards/)
   - 借鉴：响应式网格、全局筛选、总览到设备详情的下钻。
   - 不照搬：拖拽式仪表盘编辑器和复杂实体别名。

2. [ThingsBoard Alarms](https://thingsboard.io/docs/user-guide/alarms/)
   - 借鉴：严重度摘要、时间/状态筛选、报警表格和详情层级。
   - 不照搬：负责人、Clear、评论等当前后端没有的动作。

3. [Ubidots Dashboards](https://help.ubidots.com/en/articles/2400308-create-dashboards-and-widgets)
   - 借鉴：切换设备后整页指标同步刷新、日期范围和刷新状态。
   - IoLink 中应改成“养殖场 → 池塘 → 设备”级联上下文。

4. [Datacake Global Dashboards](https://docs.datacake.de/dashboards/global-dashboard)
   - 借鉴：明确区分运营总览和单设备详情。
   - 不照搬：匿名公开链接；当前资源权限闭环尚未完善。

5. [ThingsPanel 可视化看板](https://thingspanel.io/docs/user-guide/tenant-operation-manual/visualization/visualization-kanban)
   - 借鉴：设备总数、在线率、最新上报和报警统计的首页组合。
   - 不照搬：插件市场、OTA、场景联动和通用 IoT 大屏编辑能力。

6. [EMQX Neuron 数据监控](https://docs.emqx.com/en/neuronex/latest/admin/monitoring.html)
   - 借鉴：设备概要、指标分组和最新数据表格。
   - 不照搬：写 Tag/远程控制；IoLink 当前只有下行协议预留。

7. [AWS IoT SiteWise Monitor](https://docs.aws.amazon.com/iot-sitewise/latest/appguide/view-dashboards.html)
   - 借鉴：层级资产浏览和工业数据看板的信息架构。
   - 不照搬：AWS 控制台式术语和复杂 portal/project 模型。

8. [aquaManager](https://www.aqua-manager.com/platform/)
   - 借鉴：围绕 pond/cage/tank 组织现场业务，而不是围绕传感器组织菜单。
   - 不照搬：生产批次、投喂、成本和预测模块。

9. [AquaOS](https://aquaos.ai/)
   - 借鉴：池塘上下文内同屏展示水质指标、活动报警和关联设备。
   - 不照搬：投喂、库存、死亡率等当前 IoLink 不具备的数据模型。

## 本骨架采用的组合

- 业务主线：AquaOS/aquaManager 的“池塘中心”
- 首页骨架：ThingsBoard/ThingsPanel 的 KPI + 状态 + 报警
- 资产层级：AWS SiteWise/Datacake 的总览与详情分层
- 设备页：EMQX Neuron 的状态与指标分组思路
- 报警页：ThingsBoard 的严重度与处置工作流
