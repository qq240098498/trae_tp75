/**
 * 本地服务入口文件
 */
import app from './app.js';
import { initDatabase } from './db/index.js';

const PORT = process.env.PORT || 3005;

async function startServer() {
  try {
    console.log('正在初始化数据库...');
    await initDatabase();
    console.log('数据库初始化完成');
    
    const server = app.listen(PORT, () => {
      console.log(`五金建材店管理系统 API 服务已启动，端口: ${PORT}`);
    });

    process.on('SIGTERM', () => {
      console.log('收到 SIGTERM 信号，正在关闭服务...');
      server.close(() => {
        console.log('服务已关闭');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('收到 SIGINT 信号，正在关闭服务...');
      server.close(() => {
        console.log('服务已关闭');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('服务启动失败:', error);
    process.exit(1);
  }
}

startServer();

export default app;