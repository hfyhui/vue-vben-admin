// 解析心跳消息
export const wsHeartbeat = function (buffer, socket) {
  const dataStr = new TextDecoder().decode(buffer.slice(1));
  const data = JSON.parse(dataStr);
  console.log(`[WebSocketStream] 收到心跳:`, data.type);

  // 回复心跳响应
  if (data.type === "ping") {
    const pongResponse = new TextEncoder().encode(JSON.stringify({ type: "pong" }));
    const pongMessage = new Uint8Array(pongResponse.length + 1);
    pongMessage[0] = 0x17; // 心跳类型
    pongMessage.set(pongResponse, 1);
    socket.send(pongMessage);
    console.log(`[WebSocketStream] 发送心跳响应: pong`);
  }
};

export const wsScreenshot = function (buffer, socket) {
  try {
    // 检查是否是错误消息（JSON格式）
    const data = buffer.slice(1);

    // 尝试解析为JSON
    try {
      const dataStr = new TextDecoder().decode(data);
      const screenshotData = JSON.parse(dataStr);

      // 检查是否是错误消息
      if (screenshotData.error) {
        console.error(`[WebSocketStream] 截图失败:`, screenshotData.error);
        return;
      }

      // 检查是否是截图数据（包含width、height和data字段）
      if (screenshotData.width && screenshotData.height && screenshotData.data) {
        console.log(`[WebSocketStream] 收到JSON格式截图数据:`, {
          width: screenshotData.width,
          height: screenshotData.height,
          dataLength: screenshotData.data.length,
        });

        // 使用用户提供的代码处理截图
        try {
          // 创建 Canvas 并绘制截图
          const canvas = document.createElement("canvas");
          canvas.width = screenshotData.width;
          canvas.height = screenshotData.height;

          const context = canvas.getContext("2d");
          const imageData = new ImageData(
            new Uint8ClampedArray(screenshotData.data),
            screenshotData.width,
            screenshotData.height
          );
          context.putImageData(imageData, 0, 0);

          // 生成下载链接并触发下载
          canvas.toBlob(blob => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              let timestamp = Date.now();
              let randomNum = Math.floor(Math.random() * 100000);
              a.download = `${timestamp}-${randomNum}.png`;

              // 触发下载
              document.body.appendChild(a);
              a.click();

              // 清理DOM元素和释放资源
              setTimeout(() => {
                document.body.removeChild(a);
                // 释放URL对象
                URL.revokeObjectURL(url);
              }, 100);

              console.log(`[WebSocketStream] 截图下载成功`);
            } else {
              console.error(`[WebSocketStream] 创建Blob失败`);
            }
          }, "image/png");
        } catch (canvasError) {
          console.error(`[WebSocketStream] Canvas处理失败:`, canvasError);
        }

        return;
      }
    } catch (e) {
      // 不是JSON，可能是二进制截图数据
      console.log(`[WebSocketStream] 解析JSON失败，可能是二进制数据:`, e.message);
    }

    // 如果不是JSON格式的截图数据，使用原来的处理逻辑
    console.log(`[WebSocketStream] 截图数据信息:`, {
      dataLength: data.length,
      deviceInfo: this.deviceInfo,
      deviceRealWidth: this.deviceRealWidth,
      deviceRealHeight: this.deviceRealHeight,
      width: this.width,
      height: this.height,
    });

    // 使用deviceInfo中的width和height，如果不存在则使用this.width和this.height
    let validWidth = this.deviceInfo?.width || this.width;
    let validHeight = this.deviceInfo?.height || this.height;

    // 如果还是无效值，尝试从数据长度推断
    if (validWidth <= 0 || validHeight <= 0) {
      console.log(`[WebSocketStream] 设备信息中的宽高无效，尝试从数据长度推断`);

      // 尝试不同的宽度和高度组合
      const possibleSizes = [
        { width: 1920, height: 1080 }, // 1080p
        { width: 1080, height: 1920 }, // 旋转的1080p
        { width: 1080, height: 2340 }, // 1080x2340
        { width: 2340, height: 1080 }, // 2340x1080
        { width: 720, height: 1280 }, // 720p
        { width: 1280, height: 720 }, // 旋转的720p
      ];

      for (const size of possibleSizes) {
        const expectedSize = size.width * size.height * 4; // RGBA格式
        if (Math.abs(data.length - expectedSize) < 1000) {
          // 允许一定的误差
          validWidth = size.width;
          validHeight = size.height;
          console.log(`[WebSocketStream] 推断的分辨率: ${validWidth}x${validHeight}`);
          break;
        }
      }

      // 如果还是无效，使用默认值
      if (validWidth <= 0 || validHeight <= 0) {
        validWidth = 1920;
        validHeight = 1080;
        console.log(`[WebSocketStream] 使用默认分辨率: 1920x1080`);
      }
    } else {
      console.log(`[WebSocketStream] 使用设备信息中的分辨率: ${validWidth}x${validHeight}`);
    }

    // 判断像素格式
    const totalPixels = validWidth * validHeight;
    const expectedRGBASize = totalPixels * 4;
    const expectedRGBSize = totalPixels * 3;
    let bytesPerPixel = 4; // 默认RGBA

    // 根据实际数据长度判断像素格式
    if (Math.abs(data.length - expectedRGBSize) < Math.abs(data.length - expectedRGBASize)) {
      bytesPerPixel = 3; // RGB格式
      console.log(`[WebSocketStream] 使用RGB格式（3字节）`);
    } else {
      bytesPerPixel = 4; // RGBA格式
      console.log(`[WebSocketStream] 使用RGBA格式（4字节）`);
    }

    // 尝试使用Canvas API将原始RGB数据转换为图片
    try {
      // 创建Canvas元素
      const canvas = document.createElement("canvas");
      canvas.width = validWidth;
      canvas.height = validHeight;
      const ctx = canvas.getContext("2d");

      // 创建ImageData对象
      const imageData = ctx.createImageData(validWidth, validHeight);
      const pixels = imageData.data;

      // 填充像素数据
      // 尝试不同的颜色通道顺序
      // 1. 首先尝试RGB/RGBA顺序
      // 2. 如果效果不好，尝试BGR/BGRA顺序
      let useBGR = false; // 默认使用RGB顺序

      const maxPixelIndex = Math.min(totalPixels, data.length / bytesPerPixel);

      console.log(`[WebSocketStream] 像素处理信息:`, {
        bytesPerPixel,
        totalPixels,
        maxPixelIndex,
        pixelDataLength: data.length,
        useBGR,
      });

      for (let i = 0; i < maxPixelIndex; i++) {
        const pixelOffset = i * 4; // ImageData总是RGBA格式（4字节）
        const pixelDataOffset = i * bytesPerPixel;

        // 确保像素数据偏移量不超出范围
        if (pixelDataOffset + (bytesPerPixel - 1) < data.length) {
          if (bytesPerPixel === 4) {
            // RGBA/BGRA格式
            if (useBGR) {
              // BGRA格式（Android常用）
              pixels[pixelOffset] = data[pixelDataOffset + 2]; // R = B
              pixels[pixelOffset + 1] = data[pixelDataOffset + 1]; // G = G
              pixels[pixelOffset + 2] = data[pixelDataOffset]; // B = R
              pixels[pixelOffset + 3] = data[pixelDataOffset + 3] || 255; // A = A
            } else {
              // RGBA格式
              pixels[pixelOffset] = data[pixelDataOffset]; // R
              pixels[pixelOffset + 1] = data[pixelDataOffset + 1]; // G
              pixels[pixelOffset + 2] = data[pixelDataOffset + 2]; // B
              pixels[pixelOffset + 3] = data[pixelDataOffset + 3] || 255; // A
            }
          } else {
            // RGB/BGR格式
            if (useBGR) {
              // BGR格式（Android常用）
              pixels[pixelOffset] = data[pixelDataOffset + 2]; // R = B
              pixels[pixelOffset + 1] = data[pixelDataOffset + 1]; // G = G
              pixels[pixelOffset + 2] = data[pixelDataOffset]; // B = R
              pixels[pixelOffset + 3] = 255; // A（不透明）
            } else {
              // RGB格式
              pixels[pixelOffset] = data[pixelDataOffset]; // R
              pixels[pixelOffset + 1] = data[pixelDataOffset + 1]; // G
              pixels[pixelOffset + 2] = data[pixelDataOffset + 2]; // B
              pixels[pixelOffset + 3] = 255; // A（不透明）
            }
          }
        }
      }

      // 将像素数据绘制到Canvas上
      ctx.putImageData(imageData, 0, 0);

      // 将Canvas内容转换为PNG图片
      canvas.toBlob(blob => {
        if (blob) {
          const url = URL.createObjectURL(blob);

          // 创建下载链接
          const a = document.createElement("a");
          a.href = url;
          a.download = `screenshot_${new Date().getTime()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          // 释放URL对象
          URL.revokeObjectURL(url);

          console.log(`[WebSocketStream] 截图下载成功`);
        } else {
          console.error(`[WebSocketStream] 创建Blob失败`);
        }
      }, "image/png");
    } catch (canvasError) {
      console.error(`[WebSocketStream] Canvas处理失败:`, canvasError);

      // 如果Canvas处理失败，保存原始数据以便分析
      const testBlob = new Blob([data], {
        type: "application/octet-stream",
      });
      const testUrl = URL.createObjectURL(testBlob);
      const testLink = document.createElement("a");
      testLink.href = testUrl;
      testLink.download = `screenshot_raw_${new Date().getTime()}.bin`;
      document.body.appendChild(testLink);
      testLink.click();
      document.body.removeChild(testLink);
      URL.revokeObjectURL(testUrl);
    }
  } catch (error) {
    console.error(`[WebSocketStream] 处理截图失败:`, error);
  }
};

export const wsSetClipboard = (buffer, socket) => {
  // 解析剪切板数据（从第二个字节开始）
  const dataStr = new TextDecoder().decode(buffer.slice(1));
  const data = JSON.parse(dataStr);
  // 从后端返回的数据格式中获取剪切板内容：{ type: "clipboard", data: "内容" }
  const clipboardText = data.data || "";

  // 将内容设置到浏览器剪切板
  if (clipboardText) {
    if (navigator.clipboard) {
      // 尝试使用现代 Clipboard API
      try {
        navigator.clipboard
          .writeText(clipboardText)
          .then(() => {
            // console.log(`[WebSocketStream] 剪切板设置成功:`, clipboardText);
          })
          .catch(err => {
            // console.error(`[WebSocketStream] 剪切板设置失败 (Clipboard API):`, err);
            // 如果失败，尝试使用传统方法
            setClipboardFallback(clipboardText);
          });
      } catch (err) {
        // console.error(`[WebSocketStream] 剪切板操作失败:`, err);
        // 如果失败，尝试使用传统方法
        setClipboardFallback(clipboardText);
      }
    } else {
      // 浏览器不支持 Clipboard API，使用传统方法
      setClipboardFallback(clipboardText);
    }
  }
};

export const setClipboardFallback = function (text) {
  try {
    // 创建一个临时的 textarea 元素
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-999999px";
    textarea.style.top = "-999999px";
    document.body.appendChild(textarea);

    // 选择并复制内容
    textarea.focus();
    textarea.select();

    const success = document.execCommand("copy");

    // 清理临时元素
    document.body.removeChild(textarea);

    if (success) {
      console.log(`[WebSocketStream] 剪切板设置成功 (传统方法):`, text);
    } else {
      console.error(`[WebSocketStream] 剪切板设置失败 (传统方法)`);
    }
  } catch (err) {
    console.error(`[WebSocketStream] 传统剪切板方法失败:`, err);
  }
};
