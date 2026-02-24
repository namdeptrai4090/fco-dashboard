import { useState, useEffect } from 'react';
import { database, ref, onValue, push, set, get } from './firebase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

// KHÔNG CÒN HARDCODE DEVICE_ID
// const DEVICE_ID = "PC_MAIN";  // XÓA DÒNG NÀY

// Hằng số tính BP
const BP_PER_CT = 22000;  // 22 nghìn tỷ BP / CT
const BP_PER_MINUTE = 95; // 95 tỷ BP / phút đập

function App() {
  // === MỚI: STATE CHO ĐĂNG NHẬP ===
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [inputAccount, setInputAccount] = useState('');
  const [availableAccounts, setAvailableAccounts] = useState([]);
  
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
  const [upgradeHistory, setUpgradeHistory] = useState([]);
  const [totalStats, setTotalStats] = useState(null);

  // === MỚI: LOAD DANH SÁCH TÀI KHOẢN ===
  useEffect(() => {
    const devicesRef = ref(database, 'devices');
    const unsubscribe = onValue(devicesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const accounts = Object.keys(data);
        setAvailableAccounts(accounts);
      }
    });
    return () => unsubscribe();
  }, []);

  // === MỚI: LOAD DATA KHI ĐÃ ĐĂNG NHẬP ===
  useEffect(() => {
    if (!isLoggedIn || !accountName) return;

    // Stats chính
    const statsRef = ref(database, `devices/${accountName}`);
    const unsubStats = onValue(statsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setStats(data);
    });

    // Total stats (cho BP)
    const totalRef = ref(database, `devices/${accountName}/total_stats`);
    const unsubTotal = onValue(totalRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setTotalStats(data);
    });

    // Upgrade history
    const upgradeRef = ref(database, `devices/${accountName}/upgrade_history`);
    const unsubUpgrade = onValue(upgradeRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const historyArray = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        }));
        historyArray.sort((a, b) => b.timestamp - a.timestamp);
        setUpgradeHistory(historyArray.slice(0, 50));
      }
    });

    // Daily stats
    const dailyRef = ref(database, `devices/${accountName}/daily_stats`);
    const unsubDaily = onValue(dailyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setDailyStats(data);
    });

    // Hourly stats
    const hourlyRef = ref(database, `devices/${accountName}/hourly_stats`);
    const unsubHourly = onValue(hourlyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setHourlyStats(data);
    });

    // CT history
    const historyRef = ref(database, `devices/${accountName}/ct_history`);
    const unsubHistory = onValue(historyRef, (snapshot) => {
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

    // Achievements
    const achievRef = ref(database, `devices/${accountName}/achievements`);
    const unsubAchiev = onValue(achievRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setAchievements(data);
    });

    // Config history
    const configRef = ref(database, `devices/${accountName}/config_history`);
    const unsubConfig = onValue(configRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const arr = Object.entries(data).map(([key, value]) => ({ id: key, ...value }));
        arr.sort((a, b) => new Date(b.time) - new Date(a.time));
        setConfigHistory(arr.slice(0, 20));
      }
    });

    // Logs
    const logsRef = ref(database, `devices/${accountName}/logs`);
    const unsubLogs = onValue(logsRef, (snapshot) => {
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

    // Screenshots
    const screenshotsRef = ref(database, `devices/${accountName}/screenshots`);
    const unsubScreenshots = onValue(screenshotsRef, (snapshot) => {
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

    return () => {
      unsubStats();
      unsubTotal();
      unsubUpgrade();
      unsubDaily();
      unsubHourly();
      unsubHistory();
      unsubAchiev();
      unsubConfig();
      unsubLogs();
      unsubScreenshots();
    };
  }, [isLoggedIn, accountName]);

  // === MỚI: HÀM ĐĂNG NHẬP ===
  const handleLogin = () => {
    const name = inputAccount.trim();
    if (!name) {
      alert('Vui lòng nhập tên tài khoản!');
      return;
    }
    setAccountName(name);
    setIsLoggedIn(true);
    localStorage.setItem('fco_account', name);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAccountName('');
    setStats(null);
    setTotalStats(null);
    localStorage.removeItem('fco_account');
  };

  // Auto login từ localStorage
  useEffect(() => {
    const saved = localStorage.getItem('fco_account');
    if (saved) {
      setAccountName(saved);
      setIsLoggedIn(true);
    }
  }, []);

  // Commands
  const handleScreenshot = () => {
    push(ref(database, `devices/${accountName}/commands`), {
      command: "SCREENSHOT",
      time: new Date().toISOString()
    });
    alert("📸 Đã gửi lệnh chụp màn hình!");
  };

  const handleStop = () => {
    if (!confirm("Bạn chắc chắn muốn dừng bot?")) return;
    push(ref(database, `devices/${accountName}/commands`), {
      command: "STOP",
      time: new Date().toISOString()
    });
    alert("🛑 Đã gửi lệnh dừng!");
  };

  const handleStart = () => {
    push(ref(database, `devices/${accountName}/commands`), {
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
    set(ref(database, `devices/${accountName}/remote_config/buy_duration_minutes`), duration);
    alert(`⚙️ Đã đặt thời gian mua phôi thành ${duration} phút!`);
  };

  // === MỚI: TÍNH BP LỜI THEO CÔNG THỨC MỚI ===
  const calculateBPProfit = () => {
    if (!totalStats) return 0;
    
    const totalCT = totalStats.all_time || 0;
    const totalMinutes = totalStats.total_upgrade_time_minutes || 0;
    
    // BP lời = (CT × 22,000 tỷ) - (phút × 95 tỷ)
    const ctProfit = totalCT * BP_PER_CT;
    const upgradeCost = totalMinutes * BP_PER_MINUTE;
    
    return ctProfit - upgradeCost;
  };

  const formatBP = (bpBillion) => {
    if (bpBillion >= 1000000) {
      return `${(bpBillion / 1000000).toFixed(2)} triệu tỷ`;
    } else if (bpBillion >= 1000) {
      return `${(bpBillion / 1000).toFixed(2)} nghìn tỷ`;
    } else {
      return `${bpBillion.toFixed(0)} tỷ`;
    }
  };

  // Các hàm tính toán (giữ nguyên)
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

  const getPeakHours = () => {
    const sorted = Object.entries(hourlyStats)
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
      .sort((a, b) => b.count - a.count);
    return sorted.slice(0, 3);
  };

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

  const getEfficiency = () => {
    const totalLoops = stats?.current_loop || 0;
    const totalCt = stats?.total_ct_processed || 0;
    if (totalLoops === 0) return 0;
    return Math.round((totalCt / totalLoops) * 100);
  };

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

  const getUpgradeChartData = () => {
    return upgradeHistory.slice(0, 20).reverse().map((upgrade, index) => ({
      index: `#${index + 1}`,
      time: upgrade.duration_minutes || 0,
      buyTime: upgrade.buy_duration || 15,
      target: 20
    }));
  };

  const filteredLogs = logFilter === 'ALL' 
    ? logs 
    : logs.filter(log => log.level === logFilter);

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
    a.download = `fco_history_${accountName}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
  const upgradeStats = getUpgradeStats();
  const bpProfit = calculateBPProfit();
  const weekGrowth = lastWeekStats.total_ct > 0 
    ? (((weekStats.total_ct - lastWeekStats.total_ct) / lastWeekStats.total_ct) * 100).toFixed(1)
    : 0;

  // === MÀN HÌNH ĐĂNG NHẬP ===
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🎮</span>
            </div>
            <h1 className="text-2xl font-bold">FCO Dashboard</h1>
            <p className="text-slate-400 text-sm">Đăng nhập để xem thống kê</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Tên tài khoản</label>
              <input
                type="text"
                value={inputAccount}
                onChange={(e) => setInputAccount(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Nhập tên tài khoản..."
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            {availableAccounts.length > 0 && (
              <div>
                <label className="block text-sm text-slate-400 mb-1">Hoặc chọn tài khoản có sẵn</label>
                <div className="flex flex-wrap gap-2">
                  {availableAccounts.map(acc => (
                    <button
                      key={acc}
                      onClick={() => setInputAccount(acc)}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        inputAccount === acc 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {acc}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 font-bold py-3 px-4 rounded-lg transition-all"
            >
              🚀 Đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === MÀN HÌNH CHÍNH (ĐÃ ĐĂNG NHẬP) ===
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
                <p className="text-xs text-slate-400 hidden md:block">👤 {accountName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}></div>
              <span className="text-sm font-medium">{getStatusText()}</span>
              <span className="text-xs text-slate-400 hidden md:inline">
                +{stats?.current_plus_mode || 3}
              </span>
              <button
                onClick={handleLogout}
                className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-sm"
              >
                🚪 Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Alerts */}
        <div id="alerts" className="space-y-2">
          {!isOnline() && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 flex items-center gap-3">
              <span className="text-2xl">🔴</span>
              <div>
                <div className="font-bold text-red-400">Tool Offline!</div>
                <div className="text-sm text-red-300">Kiểm tra kết nối</div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats - THÊM BP LỜI */}
        <div id="stats" className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-xs mb-1">Trạng thái</div>
            <div className="text-xl font-bold">{getStatusText()}</div>
            <div className="text-xs text-slate-500">Loop #{stats?.current_loop || 0}</div>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-xs mb-1">Tổng CT</div>
            <div className="text-xl font-bold text-green-400">{stats?.total_ct_processed || 0}</div>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-xs mb-1">Uptime</div>
            <div className="text-xl font-bold">{calculateUptime(stats?.start_time)}</div>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-slate-400 text-xs mb-1">TB/CT</div>
            <div className="text-xl font-bold">{stats?.avg_time_per_ct || 0}p</div>
          </div>

          <div className="bg-cyan-900/20 rounded-xl p-4 border border-cyan-700">
            <div className="text-cyan-400 text-xs mb-1">⏱️ Đập thẻ</div>
            <div className="text-xl font-bold text-cyan-300">{upgradeStats.last}p</div>
            <div className="text-xs text-cyan-500">TB: {upgradeStats.avg}p</div>
          </div>

          {/* MỚI: BP LỜI */}
          <div className="bg-yellow-900/20 rounded-xl p-4 border border-yellow-700">
            <div className="text-yellow-400 text-xs mb-1">💰 BP Lời</div>
            <div className="text-lg font-bold text-yellow-300">{formatBP(bpProfit)}</div>
            <div className="text-xs text-yellow-500">
              {totalStats?.total_upgrade_time_minutes?.toFixed(0) || 0}p đập
            </div>
          </div>
        </div>

        {/* BP PROFIT DETAIL */}
        <div className="bg-yellow-900/20 rounded-xl p-4 border border-yellow-700">
          <h2 className="text-lg font-bold mb-3">💰 Chi tiết BP Lời</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-900/30 rounded-lg p-3">
              <div className="text-green-400 text-sm">Thu từ CT</div>
              <div className="text-xl font-bold text-green-300">
                +{formatBP((stats?.total_ct_processed || 0) * BP_PER_CT)}
              </div>
              <div className="text-xs text-green-500">
                {stats?.total_ct_processed || 0} CT × 22k tỷ
              </div>
            </div>
            
            <div className="bg-red-900/30 rounded-lg p-3">
              <div className="text-red-400 text-sm">Chi phí đập</div>
              <div className="text-xl font-bold text-red-300">
                -{formatBP((totalStats?.total_upgrade_time_minutes || 0) * BP_PER_MINUTE)}
              </div>
              <div className="text-xs text-red-500">
                {totalStats?.total_upgrade_time_minutes?.toFixed(0) || 0}p × 95 tỷ
              </div>
            </div>
            
            <div className="bg-yellow-900/30 rounded-lg p-3">
              <div className="text-yellow-400 text-sm">Lợi nhuận</div>
              <div className={`text-xl font-bold ${bpProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {bpProfit >= 0 ? '+' : ''}{formatBP(bpProfit)}
              </div>
              <div className="text-xs text-yellow-500">
                Công thức: CT×22k - Phút×95
              </div>
            </div>
          </div>
        </div>

        {/* Current Step */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Bước hiện tại</div>
          <div className="text-lg font-medium">{stats?.current_step || "Đang chờ..."}</div>
        </div>

        {/* Time Stats */}
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
            <div className="text-xs text-slate-400">Streak</div>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-2xl font-bold">{efficiency}%</div>
            <div className="text-xs text-slate-400">Hiệu suất</div>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
            <div className="text-3xl mb-2">📈</div>
            <div className="text-xl font-bold">{predictions.avgPerDay}</div>
            <div className="text-xs text-slate-400">CT/ngày</div>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-xl font-bold">~{predictions.endOfMonth}</div>
            <div className="text-xs text-slate-400">Cuối tháng</div>
          </div>
        </div>

        {/* Upgrade Time Stats */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h2 className="text-lg font-bold mb-4">⏱️ Thời gian đập thẻ</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-700">
              <div className="text-blue-400 text-xs mb-1">Gần nhất</div>
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
          
          {upgradeHistory.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={getUpgradeChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="index" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Legend />
                <Line type="monotone" dataKey="time" stroke="#06b6d4" strokeWidth={2} name="Đập (p)" />
                <Line type="monotone" dataKey="buyTime" stroke="#3b82f6" strokeWidth={2} name="Mua (p)" strokeDasharray="5 5" />
                <Line type="monotone" dataKey="target" stroke="#22c55e" strokeWidth={1} name="Mục tiêu" strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* CT Chart */}
        <div id="charts" className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">📊 CT theo ngày</h2>
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

        {/* Hourly Stats */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h2 className="text-lg font-bold mb-4">🕐 Theo giờ</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={getHourlyChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="hour" stroke="#9ca3af" tick={{ fontSize: 10 }} interval={2} />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <Bar dataKey="ct" fill="#8b5cf6" name="CT" />
            </BarChart>
          </ResponsiveContainer>
          
          <div className="mt-4">
            <div className="text-sm font-bold mb-2">🏆 Giờ vàng:</div>
            <div className="flex gap-2 flex-wrap">
              {peakHours.map((h, i) => (
                <span key={h.hour} className={`px-3 py-1 rounded text-sm ${i === 0 ? 'bg-yellow-600' : i === 1 ? 'bg-slate-500' : 'bg-orange-700'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {h.hour} ({h.count})
                </span>
              ))}
            </div>
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
                📸 Screenshot
              </button>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold mb-4">🔧 Config</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-slate-400">Mua phôi:</span>
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
                  Hiện tại: {stats?.remote_config?.buy_duration_minutes || 15}p | Min: 10p | Max: 30p
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

        {/* Logs */}
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

        {/* CT History */}
        <div id="history" className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">📜 Lịch sử CT</h2>
            <button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm">
              📥 Export
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
                  <tr><td colSpan="4" className="text-center py-8 text-slate-500">Chưa có</td></tr>
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
          FCO Dashboard v4.0 — Multi-Account + BP Profit Tracking
        </div>
      </footer>
    </div>
  );
}

export default App;