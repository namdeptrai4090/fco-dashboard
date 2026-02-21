import { useState, useEffect } from 'react';
import { database, ref, onValue, push, set } from './firebase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays } from 'date-fns';

const DEVICE_ID = "PC_MAIN";
const BP_PER_CT = 20000; // Ước tính BP mỗi CT

function App() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [newBuyDuration, setNewBuyDuration] = useState(20);
  const [dailyStats, setDailyStats] = useState({});
  const [ctHistory, setCtHistory] = useState([]);
  const [achievements, setAchievements] = useState(null);
  const [hourlyStats, setHourlyStats] = useState({});
  const [configHistory, setConfigHistory] = useState([]);
  const [chartView, setChartView] = useState('week');
  const [logFilter, setLogFilter] = useState('ALL');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState(500);
  const [upgradeHistory, setUpgradeHistory] = useState([]); // MỚI: Lịch sử thời gian đập thẻ

  // Lắng nghe stats chính
  useEffect(() => {
    const statsRef = ref(database, `devices/${DEVICE_ID}`);
    const unsubscribe = onValue(statsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setStats(data);
    });
    return () => unsubscribe();
  }, []);

  // MỚI: Lắng nghe upgrade history (thời gian đập thẻ)
  useEffect(() => {
    const upgradeRef = ref(database, `devices/${DEVICE_ID}/upgrade_history`);
    const unsubscribe = onValue(upgradeRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const historyArray = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        }));
        historyArray.sort((a, b) => b.timestamp - a.timestamp);
        setUpgradeHistory(historyArray.slice(0, 50)); // Lấy 50 lần gần nhất
      }
    });
    return () => unsubscribe();
  }, []);

  // Lắng nghe daily stats
  useEffect(() => {
    const dailyRef = ref(database, `devices/${DEVICE_ID}/daily_stats`);
    const unsubscribe = onValue(dailyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setDailyStats(data);
    });
    return () => unsubscribe();
  }, []);

  // Lắng nghe hourly stats
  useEffect(() => {
    const hourlyRef = ref(database, `devices/${DEVICE_ID}/hourly_stats`);
    const unsubscribe = onValue(hourlyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setHourlyStats(data);
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
        setCtHistory(historyArray.slice(0, 50));
      }
    });
    return () => unsubscribe();
  }, []);

  // Lắng nghe achievements
  useEffect(() => {
    const achievRef = ref(database, `devices/${DEVICE_ID}/achievements`);
    const unsubscribe = onValue(achievRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setAchievements(data);
    });
    return () => unsubscribe();
  }, []);

  // Lắng nghe config history
  useEffect(() => {
    const configRef = ref(database, `devices/${DEVICE_ID}/config_history`);
    const unsubscribe = onValue(configRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const arr = Object.entries(data).map(([key, value]) => ({ id: key, ...value }));
        arr.sort((a, b) => new Date(b.time) - new Date(a.time));
        setConfigHistory(arr.slice(0, 20));
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
        setLogs(logArray.slice(0, 100));
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

  // Commands
  const handleScreenshot = () => {
    push(ref(database, `devices/${DEVICE_ID}/commands`), {
      command: "SCREENSHOT",
      time: new Date().toISOString()
    });
    alert("📸 Đã gửi lệnh chụp màn hình!");
  };

  const handleStop = () => {
    if (!confirm("Bạn chắc chắn muốn dừng bot?")) return;
    push(ref(database, `devices/${DEVICE_ID}/commands`), {
      command: "STOP",
      time: new Date().toISOString()
    });
    alert("🛑 Đã gửi lệnh dừng!");
  };

  const handleStart = () => {
    push(ref(database, `devices/${DEVICE_ID}/commands`), {
      command: "START",
      time: new Date().toISOString()
    });
    alert("▶️ Đã gửi lệnh khởi động!");
  };

  const handleChangeBuyDuration = () => {
    const duration = parseInt(newBuyDuration);
    if (isNaN(duration) || duration < 1 || duration > 60) {
      alert("Thời gian phải từ 1-60 phút!");
      return;
    }
    set(ref(database, `devices/${DEVICE_ID}/remote_config/buy_duration_minutes`), duration);
    alert(`⚙️ Đã đặt thời gian mua phôi thành ${duration} phút!`);
  };

  // Tính toán
  const calculateUptime = (startTime) => {
    if (!startTime) return "---";
    const start = new Date(startTime);
    const now = new Date();
    const diff = now - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const isOnline = () => {
    if (!stats?.last_heartbeat) return false;
    const lastBeat = new Date(stats.last_heartbeat);
    const now = new Date();
    const diff = (now - lastBeat) / 1000;
    return diff < 120;
  };

  const getStatusColor = () => {
    if (!isOnline()) return "bg-red-500";
    if (stats?.status === "RUNNING" || stats?.status === "UPGRADING" || stats?.status === "BUYING" || stats?.status === "SNIPING") return "bg-green-500";
    if (stats?.status === "ERROR") return "bg-red-500";
    return "bg-yellow-500";
  };

  const getStatusText = () => {
    if (!isOnline()) return "OFFLINE";
    return stats?.status || "UNKNOWN";
  };

  // Chart data
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

  // Hourly chart data
  const getHourlyChartData = () => {
    const data = [];
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0');
      data.push({
        hour: `${hour}:00`,
        ct: hourlyStats[hour] || 0
      });
    }
    return data;
  };

  // Peak hours
  const getPeakHours = () => {
    const sorted = Object.entries(hourlyStats)
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
      .sort((a, b) => b.count - a.count);
    return sorted.slice(0, 3);
  };

  // Stats calculations
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

  const getLastWeekStats = () => {
    let totalCt = 0;
    for (let i = 7; i < 14; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayData = dailyStats[date];
      if (dayData) {
        totalCt += dayData.total_ct || 0;
      }
    }
    return { total_ct: totalCt };
  };

  const getMonthStats = () => {
    let totalCt = 0;
    let totalTime = 0;
    let count = 0;
    for (let i = 0; i < 30; i++) {
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

  // Streak calculation
  const getStreak = () => {
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      if (dailyStats[date]?.total_ct > 0) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  // Efficiency
  const getEfficiency = () => {
    const totalLoops = stats?.current_loop || 0;
    const totalCt = stats?.total_ct_processed || 0;
    if (totalLoops === 0) return 0;
    return Math.round((totalCt / totalLoops) * 100);
  };

  // Predictions
  const getPredictions = () => {
    const monthStats = getMonthStats();
    const avgPerDay = monthStats.total_ct / 30;
    const daysRemaining = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
    const endOfMonth = monthStats.total_ct + (avgPerDay * daysRemaining);
    const endOfYear = (stats?.total_ct_processed || 0) + (avgPerDay * 365);
    
    return {
      avgPerDay: avgPerDay.toFixed(1),
      endOfMonth: Math.round(endOfMonth),
      endOfYear: Math.round(endOfYear)
    };
  };

  // MỚI: Tính toán thống kê thời gian đập thẻ
  const getUpgradeStats = () => {
    if (upgradeHistory.length === 0) {
      return {
        last: stats?.last_upgrade_duration || 0,
        avg: stats?.avg_upgrade_duration || 0,
        min: 0,
        max: 0,
        total: 0
      };
    }
    
    const durations = upgradeHistory.map(u => u.duration_minutes || 0).filter(d => d > 0);
    if (durations.length === 0) {
      return {
        last: stats?.last_upgrade_duration || 0,
        avg: stats?.avg_upgrade_duration || 0,
        min: 0,
        max: 0,
        total: 0
      };
    }
    
    const total = durations.length;
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / total;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const last = upgradeHistory[0]?.duration_minutes || stats?.last_upgrade_duration || 0;
    
    return {
      last: parseFloat(last).toFixed(1),
      avg: avg.toFixed(1),
      min: min.toFixed(1),
      max: max.toFixed(1),
      total: total
    };
  };

  // MỚI: Chart data cho thời gian đập thẻ
  const getUpgradeChartData = () => {
    return upgradeHistory.slice(0, 20).reverse().map((upgrade, index) => ({
      index: `#${index + 1}`,
      time: upgrade.duration_minutes || 0,
      buyTime: upgrade.buy_duration || 15,
      target: 20
    }));
  };

  // Filter logs
  const filteredLogs = logFilter === 'ALL' 
    ? logs 
    : logs.filter(log => log.level === logFilter);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Loop', 'Mode', 'Duration (min)'];
    const rows = ctHistory.map(ct => [
      ct.date,
      ct.time,
      ct.loop_number,
      ct.mode,
      Math.round(ct.duration_seconds / 60)
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fco_history_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const todayStats = getTodayStats();
  const weekStats = getWeekStats();
  const lastWeekStats = getLastWeekStats();
  const monthStats = getMonthStats();
  const streak = getStreak();
  const efficiency = getEfficiency();
  const predictions = getPredictions();
  const peakHours = getPeakHours();
  const upgradeStats = getUpgradeStats(); // MỚI
  const totalBP = (stats?.total_ct_processed || 0) * BP_PER_CT;
  const weekGrowth = lastWeekStats.total_ct > 0 
    ? (((weekStats.total_ct - lastWeekStats.total_ct) / lastWeekStats.total_ct) * 100).toFixed(1)
    : 0;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Mobile Menu Button */}
      <button 
        className="md:hidden fixed top-4 left-4 z-50 bg-slate-800 p-2 rounded-lg"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? '✕' : '☰'}
      </button>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900/95 z-40 p-6 pt-16">
          <nav className="space-y-4">
            <a href="#stats" className="block text-lg py-2" onClick={() => setMobileMenuOpen(false)}>📊 Thống kê</a>
            <a href="#charts" className="block text-lg py-2" onClick={() => setMobileMenuOpen(false)}>📈 Biểu đồ</a>
            <a href="#history" className="block text-lg py-2" onClick={() => setMobileMenuOpen(false)}>📜 Lịch sử</a>
            <a href="#controls" className="block text-lg py-2" onClick={() => setMobileMenuOpen(false)}>⚙️ Điều khiển</a>
            <a href="#logs" className="block text-lg py-2" onClick={() => setMobileMenuOpen(false)}>📝 Logs</a>
          </nav>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-950/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 ml-10 md:ml-0">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <span className="text-2xl">🎮</span>
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold">FCO Dashboard</h1>
                <p className="text-xs text-slate-400 hidden md:block">T.Courtois 24/7 Automation</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}></div>
              <span className="text-sm font-medium">{getStatusText()}</span>
              <span className="text-xs text-slate-400 hidden md:inline">
                Mode: +{stats?.current_plus_mode || 3}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Alerts Section */}
        <div id="alerts" className="space-y-2">
          {!isOnline() && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 flex items-center gap-3">
              <span className="text-2xl">🔴</span>
              <div>
                <div className="font-bold text-red-400">Tool Offline!</div>
                <div className="text-sm text-red-300">Kiểm tra kết nối ngay</div>
              </div>
            </div>
          )}
          {todayStats.total_ct >= 100 && (
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <div className="font-bold text-green-400">Đạt 100 CT hôm nay!</div>
                <div className="text-sm text-green-300">Tiếp tục phát huy!</div>
              </div>
            </div>
          )}
          {parseFloat(weekGrowth) < -10 && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="font-bold text-yellow-400">Hiệu suất giảm {Math.abs(weekGrowth)}%</div>
                <div className="text-sm text-yellow-300">So với tuần trước</div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats Row - ĐÃ SỬA: 5 cột + thêm card Đập thẻ */}
        <div id="stats" className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-xs mb-1">Trạng thái</div>
            <div className="text-xl font-bold">{getStatusText()}</div>
            <div className="text-xs text-slate-500">Loop #{stats?.current_loop || 0}</div>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-xs mb-1">Tổng CT</div>
            <div className="text-xl font-bold text-green-400">{stats?.total_ct_processed || 0}</div>
            <div className="text-xs text-slate-500">Tích lũy</div>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-xs mb-1">Uptime</div>
            <div className="text-xl font-bold">{calculateUptime(stats?.start_time)}</div>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-xs mb-1">TB/CT</div>
            <div className="text-xl font-bold">{stats?.avg_time_per_ct || 0}p</div>
          </div>

          {/* MỚI: Card thời gian đập thẻ */}
          <div className="bg-cyan-900/20 rounded-xl p-4 border border-cyan-700">
            <div className="text-cyan-400 text-xs mb-1">⏱️ Đập thẻ</div>
            <div className="text-xl font-bold text-cyan-300">{upgradeStats.last}p</div>
            <div className="text-xs text-cyan-500">TB: {upgradeStats.avg}p</div>
          </div>
        </div>

        {/* Current Step */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Bước hiện tại</div>
          <div className="text-lg font-medium">{stats?.current_step || "Đang chờ..."}</div>
        </div>

        {/* Time Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-700">
            <div className="text-blue-400 text-xs mb-1">Hôm nay</div>
            <div className="text-xl font-bold text-blue-300">{todayStats.total_ct} CT</div>
            <div className="text-xs text-blue-500">TB: {todayStats.avg_time || 0}p</div>
          </div>

          <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-700">
            <div className="text-purple-400 text-xs mb-1">Tuần này</div>
            <div className="text-xl font-bold text-purple-300">{weekStats.total_ct} CT</div>
            <div className={`text-xs ${parseFloat(weekGrowth) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {parseFloat(weekGrowth) >= 0 ? '↑' : '↓'} {Math.abs(weekGrowth)}%
            </div>
          </div>

          <div className="bg-orange-900/20 rounded-xl p-4 border border-orange-700">
            <div className="text-orange-400 text-xs mb-1">Tháng này</div>
            <div className="text-xl font-bold text-orange-300">{monthStats.total_ct} CT</div>
            <div className="text-xs text-orange-500">TB: {monthStats.avg_time}p</div>
          </div>

          <div className="bg-green-900/20 rounded-xl p-4 border border-green-700">
            <div className="text-green-400 text-xs mb-1">Kỷ lục</div>
            <div className="text-xl font-bold text-green-300">{achievements?.best_day?.count || 0}</div>
            <div className="text-xs text-green-500">{achievements?.best_day?.date || '---'}</div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
            <div className="text-3xl mb-2">🔥</div>
            <div className="text-2xl font-bold">{streak}</div>
            <div className="text-xs text-slate-400">Streak (ngày)</div>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-2xl font-bold">{efficiency}%</div>
            <div className="text-xs text-slate-400">Hiệu suất</div>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-xl font-bold">{(totalBP / 1000000).toFixed(1)}M</div>
            <div className="text-xs text-slate-400">BP (ước tính)</div>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
            <div className="text-3xl mb-2">📈</div>
            <div className="text-xl font-bold">{predictions.avgPerDay}</div>
            <div className="text-xs text-slate-400">CT/ngày</div>
          </div>
        </div>

        {/* MỚI: Thống kê thời gian đập thẻ chi tiết */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h2 className="text-lg font-bold mb-4">⏱️ Thống kê thời gian đập thẻ</h2>
          
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-700">
              <div className="text-blue-400 text-xs mb-1">Lần gần nhất</div>
              <div className="text-2xl font-bold text-blue-300">{upgradeStats.last}p</div>
            </div>
            
            <div className="bg-green-900/20 rounded-lg p-3 border border-green-700">
              <div className="text-green-400 text-xs mb-1">Trung bình</div>
              <div className="text-2xl font-bold text-green-300">{upgradeStats.avg}p</div>
            </div>
            
            <div className="bg-yellow-900/20 rounded-lg p-3 border border-yellow-700">
              <div className="text-yellow-400 text-xs mb-1">Nhanh nhất</div>
              <div className="text-2xl font-bold text-yellow-300">{upgradeStats.min}p</div>
            </div>
            
            <div className="bg-red-900/20 rounded-lg p-3 border border-red-700">
              <div className="text-red-400 text-xs mb-1">Chậm nhất</div>
              <div className="text-2xl font-bold text-red-300">{upgradeStats.max}p</div>
            </div>
          </div>
          
          {/* Target Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>🎯 Mục tiêu: 20 phút/lần</span>
              <span className={parseFloat(upgradeStats.avg) <= 20 ? 'text-green-400' : 'text-red-400'}>
                {parseFloat(upgradeStats.avg) <= 20 ? '✅ Đạt' : '❌ Chưa đạt'}
              </span>
            </div>
            <div className="bg-slate-700 rounded-full h-3">
              <div 
                className={`rounded-full h-3 transition-all ${
                  parseFloat(upgradeStats.avg) <= 20 ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min((20 / Math.max(parseFloat(upgradeStats.avg), 1)) * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {parseFloat(upgradeStats.avg) <= 20 
                ? `⚡ Nhanh hơn mục tiêu ${(20 - parseFloat(upgradeStats.avg)).toFixed(1)}p`
                : `⚠️ Chậm hơn mục tiêu ${(parseFloat(upgradeStats.avg) - 20).toFixed(1)}p`
              }
            </div>
          </div>
          
          {/* Chart */}
          {upgradeHistory.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={getUpgradeChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="index" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Legend />
                <Line type="monotone" dataKey="time" stroke="#06b6d4" strokeWidth={2} name="Đập thẻ (p)" dot={{ fill: '#06b6d4' }} />
                <Line type="monotone" dataKey="buyTime" stroke="#3b82f6" strokeWidth={2} name="Mua phôi (p)" strokeDasharray="5 5" />
                <Line type="monotone" dataKey="target" stroke="#22c55e" strokeWidth={1} name="Mục tiêu" strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          )}
          
          {/* Auto Adjust Info */}
          <div className="mt-4 bg-green-900/20 border border-green-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">⚙️</span>
              <span className="font-bold text-green-400">Tự động điều chỉnh mua phôi: ✅ BẬT</span>
            </div>
            <div className="text-sm text-slate-300">
              Công thức: <code className="bg-slate-900 px-2 py-0.5 rounded">Mua mới = Mua cũ × (20 / Thời gian đập)</code>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              📌 Mục tiêu: 20p/lần | Min: 5p | Max: 60p | Hiện tại: {stats?.remote_config?.buy_duration_minutes || 15}p
            </div>
          </div>
          
          {/* Recent History Table */}
          <div className="mt-4">
            <div className="text-sm font-bold mb-2">📜 Lịch sử 10 lần gần nhất:</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-2">Thời gian</th>
                    <th className="text-left py-2 px-2">Đập thẻ</th>
                    <th className="text-left py-2 px-2">Mua phôi</th>
                    <th className="text-left py-2 px-2">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {upgradeHistory.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-4 text-slate-500">Chưa có dữ liệu</td></tr>
                  ) : (
                    upgradeHistory.slice(0, 10).map((upgrade) => (
                      <tr key={upgrade.id} className="border-b border-slate-700/50">
                        <td className="py-2 px-2">{upgrade.date} {upgrade.time}</td>
                        <td className="py-2 px-2">
                          <span className={parseFloat(upgrade.duration_minutes) <= 20 ? 'text-green-400' : 'text-red-400'}>
                            {parseFloat(upgrade.duration_minutes).toFixed(1)}p
                          </span>
                        </td>
                        <td className="py-2 px-2">{upgrade.buy_duration}p</td>
                        <td className="py-2 px-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            upgrade.mode === '+3' ? 'bg-green-900/50' : 'bg-orange-900/50'
                          }`}>
                            {upgrade.mode}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Week Comparison */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h2 className="text-lg font-bold mb-4">📊 So sánh với tuần trước</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-sm text-slate-400">Tuần này</div>
              <div className="text-2xl font-bold text-blue-400">{weekStats.total_ct} CT</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-400">Tuần trước</div>
              <div className="text-2xl font-bold text-slate-400">{lastWeekStats.total_ct} CT</div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <span className={`text-lg font-bold ${parseFloat(weekGrowth) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {parseFloat(weekGrowth) >= 0 ? '📈' : '📉'} {weekGrowth}%
            </span>
          </div>
        </div>

        {/* Goals & Predictions */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h2 className="text-lg font-bold mb-4">🎯 Mục tiêu & Dự đoán</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Mục tiêu tháng: {monthlyGoal} CT</span>
                <span>{Math.round((monthStats.total_ct / monthlyGoal) * 100)}%</span>
              </div>
              <div className="bg-slate-700 rounded-full h-3">
                <div 
                  className="bg-blue-500 rounded-full h-3 transition-all"
                  style={{ width: `${Math.min((monthStats.total_ct / monthlyGoal) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Còn {Math.max(monthlyGoal - monthStats.total_ct, 0)} CT | 
                Cần ~{Math.ceil((monthlyGoal - monthStats.total_ct) / (new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate() || 1))} CT/ngày
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-slate-400 text-xs">Dự đoán cuối tháng</div>
                <div className="text-xl font-bold text-blue-400">~{predictions.endOfMonth} CT</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">Dự đoán cuối năm</div>
                <div className="text-xl font-bold text-purple-400">~{predictions.endOfYear} CT</div>
              </div>
            </div>
          </div>
        </div>

        {/* CT Chart */}
        <div id="charts" className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">📊 Số CT theo ngày</h2>
            <div className="flex gap-2">
              <button onClick={() => setChartView('week')} className={`px-3 py-1 rounded text-sm ${chartView === 'week' ? 'bg-blue-600' : 'bg-slate-700'}`}>7 ngày</button>
              <button onClick={() => setChartView('month')} className={`px-3 py-1 rounded text-sm ${chartView === 'month' ? 'bg-blue-600' : 'bg-slate-700'}`}>30 ngày</button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <Bar dataKey="ct" fill="#3b82f6" name="CT" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Avg Time Chart */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h2 className="text-lg font-bold mb-4">⏱️ Thời gian TB (phút/CT)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <Line type="monotone" dataKey="avgTime" stroke="#10b981" strokeWidth={2} name="Phút" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Stats */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h2 className="text-lg font-bold mb-4">🕐 Thống kê theo giờ</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={getHourlyChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="hour" stroke="#9ca3af" tick={{ fontSize: 10 }} interval={2} />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <Bar dataKey="ct" fill="#8b5cf6" name="CT" />
            </BarChart>
          </ResponsiveContainer>
          
          {/* Peak Hours */}
          <div className="mt-4">
            <div className="text-sm font-bold mb-2">🏆 Khung giờ vàng:</div>
            <div className="flex gap-2 flex-wrap">
              {peakHours.map((h, i) => (
                <span key={h.hour} className={`px-3 py-1 rounded text-sm ${i === 0 ? 'bg-yellow-600' : i === 1 ? 'bg-slate-500' : 'bg-orange-700'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {h.hour} ({h.count} CT)
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* CT History Table */}
        <div id="history" className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">📜 Lịch sử CT</h2>
            <button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm">
              📥 Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-2">Thời gian</th>
                  <th className="text-left py-2 px-2">Loop</th>
                  <th className="text-left py-2 px-2">Mode</th>
                  <th className="text-left py-2 px-2">Phút</th>
                </tr>
              </thead>
              <tbody>
                {ctHistory.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-8 text-slate-500">Chưa có dữ liệu</td></tr>
                ) : (
                  ctHistory.slice(0, 10).map((ct) => (
                    <tr key={ct.id} className="border-b border-slate-700/50">
                      <td className="py-2 px-2 text-xs">{ct.date} {ct.time}</td>
                      <td className="py-2 px-2">#{ct.loop_number}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${ct.mode === '+3' ? 'bg-green-900/50' : 'bg-orange-900/50'}`}>
                          {ct.mode}
                        </span>
                      </td>
                      <td className="py-2 px-2">{Math.round(ct.duration_seconds / 60)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Config History */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h2 className="text-lg font-bold mb-4">📝 Lịch sử thay đổi config</h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {configHistory.length === 0 ? (
              <div className="text-slate-500 text-center py-4">Chưa có thay đổi</div>
            ) : (
              configHistory.map((cfg) => (
                <div key={cfg.id} className="flex justify-between items-center text-sm bg-slate-900/50 p-2 rounded">
                  <span className="text-slate-400">{cfg.time}</span>
                  <span>{cfg.key}: {cfg.old} → {cfg.new}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Controls */}
        <div id="controls" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold mb-4">⚙️ Điều khiển</h2>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleStart} className="bg-green-600 hover:bg-green-700 font-medium py-3 px-4 rounded-lg">
                ▶️ Start
              </button>
              <button onClick={handleStop} className="bg-red-600 hover:bg-red-700 font-medium py-3 px-4 rounded-lg">
                🛑 Stop
              </button>
              <button onClick={handleScreenshot} className="col-span-2 bg-purple-600 hover:bg-purple-700 font-medium py-3 px-4 rounded-lg">
                📸 Chụp màn hình
              </button>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold mb-4">🔧 Cấu hình</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-slate-400">Thời gian mua phôi:</span>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    value={newBuyDuration}
                    onChange={(e) => setNewBuyDuration(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                    min="1" max="60"
                  />
                  <button onClick={handleChangeBuyDuration} className="bg-blue-600 hover:bg-blue-700 px-4 rounded">
                    OK
                  </button>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Hiện tại: {stats?.remote_config?.buy_duration_minutes || 15}p
                </div>
              </div>
              <div>
                <span className="text-sm text-slate-400">Mục tiêu tháng:</span>
                <input
                  type="number"
                  value={monthlyGoal}
                  onChange={(e) => setMonthlyGoal(parseInt(e.target.value) || 500)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white mt-1"
                />
              </div>
              
              {/* MỚI: Thông tin tự động điều chỉnh */}
              <div className="mt-3 p-3 bg-green-900/20 rounded-lg border border-green-700">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-400">⚙️ Tự động điều chỉnh thời gian mua:</span>
                  <span className="text-green-300 text-sm font-bold">✅ BẬT</span>
                </div>
                <div className="text-xs text-green-500 mt-2">
                  📌 Mục tiêu: 20p/lần đập | Min: 5p | Max: 60p
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Công thức: Mua mới = Mua cũ × (20 / Đập thẻ)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Screenshots */}
        {screenshots.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold mb-4">📸 Screenshots</h2>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {screenshots.slice(0, 10).map((ss) => (
                <div key={ss.id} onClick={() => setSelectedScreenshot(ss)} className="cursor-pointer border border-slate-600 hover:border-blue-500 rounded overflow-hidden">
                  <img src={`data:image/jpeg;base64,${ss.data}`} alt="Screenshot" className="w-full" />
                  <div className="text-xs text-center text-slate-400 py-1">{new Date(ss.time).toLocaleTimeString('vi-VN')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs with Filter */}
        <div id="logs" className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">📜 Logs</h2>
            <div className="flex gap-2">
              {['ALL', 'INFO', 'WARNING', 'ERROR'].map((level) => (
                <button
                  key={level}
                  onClick={() => setLogFilter(level)}
                  className={`px-2 py-1 rounded text-xs ${logFilter === level ? 'bg-blue-600' : 'bg-slate-700'}`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-slate-900 rounded-lg p-3 max-h-64 overflow-y-auto font-mono text-xs space-y-1">
            {filteredLogs.length === 0 ? (
              <div className="text-slate-500 text-center py-4">Không có log</div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className={`py-1 px-2 rounded ${
                  log.level === "ERROR" ? "bg-red-900/30 text-red-300" :
                  log.level === "WARNING" ? "bg-yellow-900/30 text-yellow-300" :
                  "text-slate-300"
                }`}>
                  <span className="text-slate-500">[{log.time}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedScreenshot(null)}>
          <div className="max-w-4xl w-full bg-slate-800 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-slate-400">{selectedScreenshot.time}</span>
              <button onClick={() => setSelectedScreenshot(null)} className="text-2xl">×</button>
            </div>
            <img src={`data:image/jpeg;base64,${selectedScreenshot.data}`} alt="Screenshot" className="w-full rounded-lg" />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          FCO Dashboard v3.1 — Full Analytics & Remote Control + Upgrade Time Tracking
        </div>
      </footer>
    </div>
  );
}

export default App;