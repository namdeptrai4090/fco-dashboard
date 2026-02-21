import { useState, useEffect } from 'react';
import { database, ref, onValue, push, set } from './firebase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const DEVICE_ID = "PC_MAIN";

function App() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [newBuyDuration, setNewBuyDuration] = useState(20);
  const [dailyStats, setDailyStats] = useState({});
  const [ctHistory, setCtHistory] = useState([]);
  const [achievements, setAchievements] = useState(null);
  const [chartView, setChartView] = useState('week'); // 'week', 'month'

  // Lắng nghe stats chính
  useEffect(() => {
    const statsRef = ref(database, `devices/${DEVICE_ID}`);
    const unsubscribe = onValue(statsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setStats(data);
      }
    });
    return () => unsubscribe();
  }, []);

  // Lắng nghe daily stats
  useEffect(() => {
    const dailyRef = ref(database, `devices/${DEVICE_ID}/daily_stats`);
    const unsubscribe = onValue(dailyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setDailyStats(data);
      }
    });
    return () => unsubscribe();
  }, []);

  // Lắng nghe CT history
  useEffect(() => {
    const historyRef = ref(database, `devices/${DEVICE_ID}/ct_history`);
    const unsubscribe = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const historyArray = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        }));
        historyArray.sort((a, b) => b.timestamp - a.timestamp);
        setCtHistory(historyArray.slice(0, 20)); // 20 gần nhất
      }
    });
    return () => unsubscribe();
  }, []);

  // Lắng nghe achievements
  useEffect(() => {
    const achievRef = ref(database, `devices/${DEVICE_ID}/achievements`);
    const unsubscribe = onValue(achievRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAchievements(data);
      }
    });
    return () => unsubscribe();
  }, []);

  // Lắng nghe logs
  useEffect(() => {
    const logsRef = ref(database, `devices/${DEVICE_ID}/logs`);
    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const logArray = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        }));
        logArray.sort((a, b) => new Date(b.time) - new Date(a.time));
        setLogs(logArray.slice(0, 50));
      }
    });
    return () => unsubscribe();
  }, []);

  // Lắng nghe screenshots
  useEffect(() => {
    const screenshotsRef = ref(database, `devices/${DEVICE_ID}/screenshots`);
    const unsubscribe = onValue(screenshotsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const screenshotArray = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        }));
        screenshotArray.sort((a, b) => new Date(b.time) - new Date(a.time));
        setScreenshots(screenshotArray);
      }
    });
    return () => unsubscribe();
  }, []);

  // Gửi lệnh
  const handleScreenshot = () => {
    const commandsRef = ref(database, `devices/${DEVICE_ID}/commands`);
    push(commandsRef, {
      command: "SCREENSHOT",
      time: new Date().toISOString()
    });
    alert("📸 Đã gửi lệnh chụp màn hình!");
  };

  const handleStop = () => {
    if (!confirm("Bạn chắc chắn muốn dừng bot?")) return;
    const commandsRef = ref(database, `devices/${DEVICE_ID}/commands`);
    push(commandsRef, {
      command: "STOP",
      time: new Date().toISOString()
    });
    alert("🛑 Đã gửi lệnh dừng!");
  };

  const handleChangeBuyDuration = () => {
    const duration = parseInt(newBuyDuration);
    if (isNaN(duration) || duration < 1 || duration > 60) {
      alert("Thời gian phải từ 1-60 phút!");
      return;
    }
    const configRef = ref(database, `devices/${DEVICE_ID}/remote_config/buy_duration_minutes`);
    set(configRef, duration);
    alert(`⚙️ Đã đặt thời gian mua phôi thành ${duration} phút!`);
  };

  // Tính uptime
  const calculateUptime = (startTime) => {
    if (!startTime) return "---";
    const start = new Date(startTime);
    const now = new Date();
    const diff = now - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Kiểm tra online
  const isOnline = () => {
    if (!stats?.last_heartbeat) return false;
    const lastBeat = new Date(stats.last_heartbeat);
    const now = new Date();
    const diff = (now - lastBeat) / 1000;
    return diff < 120;
  };

  const getStatusColor = () => {
    if (!isOnline()) return "bg-red-500";
    if (stats?.status === "RUNNING" || stats?.status === "UPGRADING" || stats?.status === "BUYING") return "bg-green-500";
    if (stats?.status === "ERROR") return "bg-red-500";
    return "bg-yellow-500";
  };

  const getStatusText = () => {
    if (!isOnline()) return "OFFLINE";
    return stats?.status || "UNKNOWN";
  };

  // Chuẩn bị dữ liệu biểu đồ
  const getChartData = () => {
    const days = chartView === 'week' ? 7 : 30;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayData = dailyStats[date];
      
      data.push({
        date: format(subDays(new Date(), i), 'dd/MM'),
        ct: dayData?.total_ct || 0,
        avgTime: dayData?.avg_time || 0
      });
    }
    
    return data;
  };

  // Stats hôm nay/tuần
  const getTodayStats = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return dailyStats[today] || { total_ct: 0, avg_time: 0 };
  };

  const getWeekStats = () => {
    let totalCt = 0;
    let totalTime = 0;
    let count = 0;
    
    for (let i = 0; i < 7; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayData = dailyStats[date];
      if (dayData) {
        totalCt += dayData.total_ct || 0;
        if (dayData.avg_time) {
          totalTime += dayData.avg_time;
          count++;
        }
      }
    }
    
    return {
      total_ct: totalCt,
      avg_time: count > 0 ? (totalTime / count).toFixed(1) : 0
    };
  };

  const todayStats = getTodayStats();
  const weekStats = getWeekStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-950/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <span className="text-2xl">🎮</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">FCO Auto Bot Dashboard</h1>
                <p className="text-xs text-slate-400">T.Courtois 24/7 Automation</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}></div>
              <span className="text-sm font-medium">{getStatusText()}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">Trạng thái</div>
            <div className="text-2xl font-bold">{getStatusText()}</div>
            <div className="text-xs text-slate-500 mt-1">
              Mode: +{stats?.current_plus_mode || 3}
            </div>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">Vòng lặp</div>
            <div className="text-2xl font-bold">#{stats?.current_loop || 0}</div>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">Tổng CT</div>
            <div className="text-2xl font-bold text-green-400">
              {stats?.total_ct_processed || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">Tích lũy</div>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">Uptime</div>
            <div className="text-2xl font-bold">{calculateUptime(stats?.start_time)}</div>
          </div>
        </div>

        {/* Stats Cards Row 2 - Today & Week */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-900/20 backdrop-blur-sm rounded-xl p-4 border border-blue-700">
            <div className="text-blue-400 text-sm mb-1">Hôm nay</div>
            <div className="text-2xl font-bold text-blue-300">{todayStats.total_ct} CT</div>
            <div className="text-xs text-blue-500 mt-1">
              TB: {todayStats.avg_time || 0}p/CT
            </div>
          </div>

          <div className="bg-purple-900/20 backdrop-blur-sm rounded-xl p-4 border border-purple-700">
            <div className="text-purple-400 text-sm mb-1">Tuần này</div>
            <div className="text-2xl font-bold text-purple-300">{weekStats.total_ct} CT</div>
            <div className="text-xs text-purple-500 mt-1">
              TB: {weekStats.avg_time}p/CT
            </div>
          </div>

          <div className="bg-green-900/20 backdrop-blur-sm rounded-xl p-4 border border-green-700">
            <div className="text-green-400 text-sm mb-1">TB Tổng</div>
            <div className="text-2xl font-bold text-green-300">
              {stats?.avg_time_per_ct || 0}p
            </div>
            <div className="text-xs text-green-500 mt-1">Mỗi CT</div>
          </div>

          <div className="bg-orange-900/20 backdrop-blur-sm rounded-xl p-4 border border-orange-700">
            <div className="text-orange-400 text-sm mb-1">Kỷ lục</div>
            <div className="text-2xl font-bold text-orange-300">
              {achievements?.best_day?.count || 0}
            </div>
            <div className="text-xs text-orange-500 mt-1">
              {achievements?.best_day?.date || '---'}
            </div>
          </div>
        </div>

        {/* Current Step */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm mb-2">Bước hiện tại</div>
          <div className="text-lg font-medium">{stats?.current_step || "Đang chờ..."}</div>
        </div>

        {/* Charts */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">📊 Biểu đồ tiến độ</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setChartView('week')}
                className={`px-3 py-1 rounded ${chartView === 'week' ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                7 ngày
              </button>
              <button
                onClick={() => setChartView('month')}
                className={`px-3 py-1 rounded ${chartView === 'month' ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                30 ngày
              </button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                labelStyle={{ color: '#e5e7eb' }}
              />
              <Legend />
              <Bar dataKey="ct" fill="#3b82f6" name="Số CT" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Avg Time Chart */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
          <h2 className="text-lg font-bold mb-4">⏱️ Thời gian trung bình</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                labelStyle={{ color: '#e5e7eb' }}
              />
              <Legend />
              <Line type="monotone" dataKey="avgTime" stroke="#10b981" name="Phút/CT" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* CT History Table */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
          <h2 className="text-lg font-bold mb-4">📜 Lịch sử CT (20 gần nhất)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-3">Thời gian</th>
                  <th className="text-left py-2 px-3">Vòng</th>
                  <th className="text-left py-2 px-3">Mode</th>
                  <th className="text-left py-2 px-3">Thời lượng</th>
                </tr>
              </thead>
              <tbody>
                {ctHistory.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-slate-500">
                      Chưa có dữ liệu
                    </td>
                  </tr>
                ) : (
                  ctHistory.map((ct) => (
                    <tr key={ct.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-2 px-3">{ct.date} {ct.time}</td>
                      <td className="py-2 px-3">#{ct.loop_number}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-1 rounded text-xs ${ct.mode === '+3' ? 'bg-green-900/50' : 'bg-orange-900/50'}`}>
                          {ct.mode}
                        </span>
                      </td>
                      <td className="py-2 px-3">{Math.round(ct.duration_seconds / 60)} phút</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold mb-4">⚙️ Điều khiển</h2>
            <div className="space-y-3">
              <button
                onClick={handleScreenshot}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                📸 Chụp màn hình
              </button>
              <button
                onClick={handleStop}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                🛑 Dừng bot
              </button>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold mb-4">🔧 Cấu hình</h2>
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-slate-400">Thời gian mua phôi (phút):</span>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    value={newBuyDuration}
                    onChange={(e) => setNewBuyDuration(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    min="1"
                    max="60"
                  />
                  <button
                    onClick={handleChangeBuyDuration}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 rounded-lg transition-colors"
                  >
                    Áp dụng
                  </button>
                </div>
              </label>
              <div className="text-xs text-slate-500">
                Hiện tại: {stats?.remote_config?.buy_duration_minutes || 20} phút
              </div>
            </div>
          </div>
        </div>

        {/* Screenshots */}
        {screenshots.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold mb-4">📸 Screenshots ({screenshots.length})</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {screenshots.slice(0, 10).map((screenshot) => (
                <div
                  key={screenshot.id}
                  onClick={() => setSelectedScreenshot(screenshot)}
                  className="cursor-pointer bg-slate-900 rounded-lg p-2 border border-slate-600 hover:border-blue-500 transition-colors"
                >
                  <img
                    src={`data:image/jpeg;base64,${screenshot.data}`}
                    alt="Screenshot"
                    className="w-full h-auto rounded"
                  />
                  <div className="text-xs text-slate-400 mt-1 text-center">
                    {new Date(screenshot.time).toLocaleTimeString('vi-VN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
          <h2 className="text-lg font-bold mb-4">📜 Nhật ký ({logs.length})</h2>
          <div className="bg-slate-900 rounded-lg p-3 max-h-96 overflow-y-auto font-mono text-sm space-y-1">
            {logs.length === 0 ? (
              <div className="text-slate-500 text-center py-8">Chưa có log nào...</div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`py-1 px-2 rounded ${
                    log.level === "ERROR" ? "bg-red-900/30 text-red-300" :
                    log.level === "WARNING" ? "bg-yellow-900/30 text-yellow-300" :
                    "text-slate-300"
                  }`}
                >
                  <span className="text-slate-500">[{log.time}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="max-w-4xl w-full">
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm text-slate-400">
                  {selectedScreenshot.time}
                </div>
                <button
                  onClick={() => setSelectedScreenshot(null)}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              <img
                src={`data:image/jpeg;base64,${selectedScreenshot.data}`}
                alt="Screenshot"
                className="w-full h-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
          FCO Auto Bot Dashboard v2.0 — Persistent Data & Advanced Analytics
        </div>
      </footer>
    </div>
  );
}

export default App;