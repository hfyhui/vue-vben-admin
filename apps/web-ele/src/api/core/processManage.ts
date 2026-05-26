import { cloudClient } from '#/api/request';

/** 获取 RPA 组件树 */
export async function getRpaComponents(params: Record<string, any>) {
  return cloudClient.get('/cloud/rpa/v1/components/', { params });
}

/** 新增 RPA 组件 */
export async function postRpaComponents(data: Record<string, any>) {
  return cloudClient.post('/cloud/rpa/api/components/', data);
}

/** 查询流程详情（含 nodeList / linkList / variables） */
export async function queryProcess(id: string) {
  return cloudClient.get(`/cloud/rpa/v1/processes/${id}/`);
}

/** 保存流程（含主流程 + 子流程） */
export async function saveProcess(data: Record<string, any>) {
  return cloudClient.post('/cloud/rpa/v1/processes/save/', data);
}

/** 执行流程 */
export async function executeProcess(data: {
  id: string;
  start_node?: string;
  end_node?: string;
  phone: string;
}) {
  return cloudClient.post('/cloud/rpa/v1/processes/execution/', data);
}

/** 编辑流程 Python 代码 */
export async function editProcessCode(id: string, data: { code: string }) {
  return cloudClient.put(`/cloud/processes/${id}/`, data);
}

/** 获取设备列表（用于运行测试选择设备） */
export async function getDeviceList(params: Record<string, any>) {
  return cloudClient.get('/mcc/api/device/page', { params });
}

/** 获取任务日志 */
export async function getTaskLog(params: { task_id: string }) {
  return cloudClient.get('/cloud/rpa/v1/jobs/tasklog/', { params });
}
