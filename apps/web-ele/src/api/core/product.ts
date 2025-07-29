// 模拟获取产品列表接口
export function getProductList() {
  return Promise.resolve([
    { id: '1', name: '产品A' },
    { id: '2', name: '产品B' },
    { id: '3', name: '产品C' },
  ]);
}

// 模拟同步接口
export function syncProduct() {
  // 随机成功或失败
  return new Promise<{ message: string; success: boolean }>((resolve) => {
    setTimeout(() => {
      const isSuccess = Math.random() > 0.3;
      resolve({
        success: isSuccess,
        message: isSuccess ? '同步成功' : '同步失败',
      });
    }, 1000);
  });
}
