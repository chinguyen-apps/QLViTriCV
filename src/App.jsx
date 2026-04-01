import React, { useState, useMemo, useEffect } from 'react';
import { Users, Columns, FileText, Search, X, Check, ArrowRightLeft, Info, FileSpreadsheet, ChevronUp, ChevronDown, Loader2, AlertCircle } from 'lucide-react';

// Hàm parse CSV tự viết để xử lý các trường hợp xuống dòng, dấu phẩy trong ngoặc kép
function parseCSV(str) {
  const arr = [];
  let quote = false;
  let row = 0, col = 0;
  for (let c = 0; c < str.length; c++) {
    let cc = str[c], nc = str[c + 1];
    arr[row] = arr[row] || [];
    arr[row][col] = (arr[row][col] || '');
    if (cc === '"' && quote && nc === '"') { arr[row][col] += cc; ++c; continue; }
    if (cc === '"') { quote = !quote; continue; }
    if (cc === ',' && !quote) { ++col; continue; }
    if (cc === '\r' && nc === '\n' && !quote) { ++row; col = 0; ++c; continue; }
    if (cc === '\n' && !quote) { ++row; col = 0; continue; }
    if (cc === '\r' && !quote) { ++row; col = 0; continue; }
    arr[row][col] += cc;
  }
  return arr;
}

// Thuật toán so sánh (Diff) văn bản theo từng từ/âm tiết
function getWordDiff(oldText, newText) {
  const oldWords = (oldText || '').split(/(\s+)/);
  const newWords = (newText || '').split(/(\s+)/);

  if (oldWords.length > 2000 || newWords.length > 2000) {
    return {
      diff1: [{ type: 'removed', value: oldText }],
      diff2: [{ type: 'added', value: newText }]
    };
  }

  const dp = Array(oldWords.length + 1).fill(null).map(() => Array(newWords.length + 1).fill(0));

  for (let i = 1; i <= oldWords.length; i++) {
    for (let j = 1; j <= newWords.length; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = oldWords.length;
  let j = newWords.length;
  const diff1 = [];
  const diff2 = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      diff1.unshift({ type: 'common', value: oldWords[i - 1] });
      diff2.unshift({ type: 'common', value: newWords[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff2.unshift({ type: 'added', value: newWords[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diff1.unshift({ type: 'removed', value: oldWords[i - 1] });
      i--;
    }
  }
  return { diff1, diff2 };
}

function DiffViewer({ diffs, type }) {
  return (
    <React.Fragment>
      {diffs.map((part, i) => {
        if (part.type === 'common') {
          return <span key={i}>{part.value}</span>;
        }
        if (part.type === 'removed' && type === 'old') {
          return <del key={i} className="bg-rose-100 text-rose-800 font-bold no-underline rounded-sm px-0.5">{part.value}</del>;
        }
        if (part.type === 'added' && type === 'new') {
          return <ins key={i} className="bg-emerald-100 text-emerald-800 font-bold no-underline rounded-sm px-0.5">{part.value}</ins>;
        }
        return null;
      })}
    </React.Fragment>
  );
}

function DetailModal({ detail, onClose, headers, getDisplayLabel }) {
  const [isGeneralOpen, setIsGeneralOpen] = useState(true);
  const [isTasksOpen, setIsTasksOpen] = useState(true);

  const taskMap = {};
  const generalInfos = [];

  headers.forEach(header => {
    const val = detail[header];
    if (!val) return;

    const isTask = /nhiệm vụ/i.test(header);
    const isDeliverable = /(sản phẩm|kết quả)/i.test(header);
    const numMatch = header.match(/(\d+)/);

    if (isTask && numMatch) {
      const id = numMatch[1];
      if (!taskMap[id]) taskMap[id] = {};
      taskMap[id].task = { header, val };
    } else if (isDeliverable && numMatch) {
      const id = numMatch[1];
      if (!taskMap[id]) taskMap[id] = {};
      taskMap[id].deliverable = { header, val };
    } else {
      generalInfos.push({ header, val });
    }
  });

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" />
            Chi tiết Vị trí: {getDisplayLabel(detail)}
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-8">
          {/* Section 1: Thông tin chung */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button 
              onClick={() => setIsGeneralOpen(!isGeneralOpen)} 
              className="w-full px-6 py-4 flex justify-between items-center bg-white hover:bg-slate-50 border-b border-slate-100 transition-colors"
            >
              <h3 className="text-base font-bold text-blue-800 flex items-center gap-2">
                <Info size={18}/> Thông tin chung
              </h3>
              {isGeneralOpen ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
            </button>
            {isGeneralOpen && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 animate-in slide-in-from-top-2">
                {generalInfos.map(({ header, val }) => (
                  <div key={header} className="flex flex-col">
                    <span className="text-xs font-semibold uppercase text-slate-400 mb-1">{header}</span>
                    <span className="text-sm text-slate-800 font-medium whitespace-pre-wrap">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Nhiệm vụ & Sản phẩm */}
          {Object.keys(taskMap).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button 
                onClick={() => setIsTasksOpen(!isTasksOpen)} 
                className="w-full px-6 py-4 flex justify-between items-center bg-white hover:bg-slate-50 border-b border-slate-100 transition-colors"
              >
                <h3 className="text-base font-bold text-blue-800 flex items-center gap-2">
                  <Check size={18}/> Nhiệm vụ trọng tâm & Sản phẩm bàn giao
                </h3>
                {isTasksOpen ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
              </button>
              {isTasksOpen && (
                <div className="p-6 space-y-4 animate-in slide-in-from-top-2">
                  {Object.keys(taskMap).sort((a,b)=>Number(a)-Number(b)).map(id => {
                    const item = taskMap[id];
                    return (
                      <div key={id} className="rounded-xl border border-slate-200 overflow-hidden flex flex-col md:flex-row shadow-sm">
                        <div className="flex-1 p-4 md:p-5 bg-blue-50/40 hover:bg-blue-50 transition-colors">
                          <span className="text-xs font-bold uppercase text-blue-700 mb-2 block">
                            {item.task?.header || `Nhiệm vụ ${id}`}
                          </span>
                          <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {item.task?.val || <span className="text-slate-400 italic">Không có nội dung</span>}
                          </p>
                        </div>
                        <div className="flex-1 p-4 md:p-5 border-t md:border-t-0 md:border-l border-slate-200 bg-teal-50/40 hover:bg-teal-50 transition-colors">
                          <span className="text-xs font-bold uppercase text-teal-700 mb-2 block">
                            {item.deliverable?.header || `Sản phẩm bàn giao ${id}`}
                          </span>
                          <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {item.deliverable?.val || <span className="text-slate-400 italic">Không có nội dung</span>}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 transition-colors shadow-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const HARDCODED_URL = "https://docs.google.com/spreadsheets/d/1WKNcq0edkaMJid_m1Mwtu4EBQawl1SGT/edit?pli=1&gid=323641730#gid=323641730";

  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'compare'
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [selectedDetail, setSelectedDetail] = useState(null);

  const [comparePos1Index, setComparePos1Index] = useState('');
  const [comparePos2Index, setComparePos2Index] = useState('');
  const [hideEmptyCompare, setHideEmptyCompare] = useState(true);
  const [hideIdenticalCompare, setHideIdenticalCompare] = useState(false);

  // Tự động load dữ liệu khi mở ứng dụng
  useEffect(() => {
    handleLoadSheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadSheet = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      let fetchUrl = HARDCODED_URL;
      
      // Tự động trích xuất ID và GID để tạo link export CSV
      if (!fetchUrl.includes('export?format=csv') && !fetchUrl.includes('pub?output=csv') && !fetchUrl.includes('tqx=out:csv')) {
        const match = fetchUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          const id = match[1];
          const gidMatch = fetchUrl.match(/[#&]gid=([0-9]+)/);
          const gid = gidMatch ? gidMatch[1] : '0';
          fetchUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;
        }
      }

      let text = '';
      try {
        const response = await fetch(fetchUrl);
        if (!response.ok) {
           throw new Error('Direct fetch failed');
        }
        text = await response.text();
      } catch (directErr) {
        console.warn("Lỗi tải trực tiếp (có thể do CORS), đang sử dụng Proxy...", directErr);
        try {
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}`;
          const proxyResponse = await fetch(proxyUrl);
          
          if (!proxyResponse.ok) {
            throw new Error('Không thể tải file qua proxy.');
          }
          text = await proxyResponse.text();
        } catch (proxyErr) {
          throw new Error('Không thể kết nối để tải dữ liệu.');
        }
      }

      if (text.trim().toLowerCase().startsWith('<!doctype html>') || text.trim().toLowerCase().startsWith('<html')) {
        throw new Error('File bị chặn bởi quyền riêng tư. Hãy đảm bảo Google Sheet đang mở quyền "Bất kỳ ai có liên kết".');
      }

      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }

      const rows = parseCSV(text);
      
      if (rows.length > 0) {
        let headerRowIndex = 0;
        let headersMap = [];

        for (let i = 0; i < Math.min(15, rows.length); i++) {
          const row = rows[i];
          const filledCells = row.filter(cell => cell && cell.trim() !== '').length;
          
          const textJoined = row.join(' ').toLowerCase();
          const hasKeywords = textJoined.includes('mã') || textJoined.includes('tên') || textJoined.includes('chức danh') || textJoined.includes('vị trí');
          
          if (filledCells >= 4 && hasKeywords) {
            headerRowIndex = i;
            let nameCount = {};
            row.forEach((h, colIndex) => {
              let name = h ? h.trim().replace(/^\uFEFF/, '').replace(/[\r\n]+/g, ' ') : '';
              if (name) {
                if (nameCount[name]) {
                  nameCount[name]++;
                  name = `${name} (${nameCount[name]})`;
                } else {
                  nameCount[name] = 1;
                }
                headersMap.push({ index: colIndex, name: name });
              }
            });
            break;
          }
        }

        if (headersMap.length === 0) {
          for (let i = 0; i < rows.length; i++) {
             if (rows[i].filter(c => c && c.trim() !== '').length >= 2) {
                headerRowIndex = i;
                rows[i].forEach((h, colIndex) => {
                  let name = h ? h.trim().replace(/^\uFEFF/, '') : '';
                  if (name) headersMap.push({ index: colIndex, name: name });
                });
                break;
             }
          }
        }

        const parsedHeaders = headersMap.map(h => h.name);
        
        const parsedData = rows.slice(headerRowIndex + 1).map((row, index) => {
          let obj = { _originalIndex: index };
          headersMap.forEach(hMap => {
            obj[hMap.name] = row[hMap.index] ? row[hMap.index].trim() : '';
          });
          return obj;
        }).filter(item => {
          const filledCount = headersMap.filter(hMap => item[hMap.name] !== '').length;
          return filledCount >= 2; 
        });

        if (parsedData.length === 0) {
            throw new Error('Không tìm thấy dữ liệu vị trí công việc hợp lệ nào trong sheet này.');
        }

        setHeaders(parsedHeaders);
        setData(parsedData);
        setIsDataLoaded(true);
      } else {
        throw new Error('File trống hoặc không đúng cấu trúc bảng.');
      }
    } catch (err) {
      console.error("Lỗi khi fetch Google Sheet:", err);
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const titleColumn = useMemo(() => {
    if (headers.length === 0) return '';
    const match = headers.find(h => h.toLowerCase().includes('vị trí chức danh') || h.toLowerCase().includes('chức danh') || h.toLowerCase().includes('tên'));
    return match || headers[0];
  }, [headers]);

  const getDisplayLabel = (item) => {
    if (!item) return '';
    const maCol = headers.find(h => {
      const lower = h.toLowerCase();
      return lower.includes('mã') && !lower.includes('phòng') && !lower.includes('khối');
    });
    const tenCol = headers.find(h => {
      const lower = h.toLowerCase();
      return (lower.includes('tên') || lower.includes('chức danh') || lower.includes('vị trí')) && !lower.includes('mã');
    });

    let parts = [];
    if (maCol && item[maCol]) parts.push(item[maCol]);
    if (tenCol && item[tenCol]) parts.push(item[tenCol]);

    if (parts.length > 0) return parts.join(' - ');
    return item[titleColumn] || `Vị trí #${item._originalIndex + 1}`;
  };

  const displayColumns = useMemo(() => {
    return headers.slice(0, 5); 
  }, [headers]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lowerSearch = searchTerm.toLowerCase();
    return data.filter(item => 
      headers.some(h => item[h] && item[h].toString().toLowerCase().includes(lowerSearch))
    );
  }, [data, searchTerm, headers]);

  // MÀN HÌNH TẢI DỮ LIỆU
  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 text-center flex flex-col items-center">
          {isLoading ? (
            <>
              <Loader2 size={48} className="animate-spin text-blue-600 mb-6" />
              <h1 className="text-xl font-bold text-slate-800 mb-2">Đang tải dữ liệu</h1>
              <p className="text-slate-500 text-sm">Hệ thống đang đồng bộ dữ liệu vị trí công việc từ Google Sheets, vui lòng đợi trong giây lát...</p>
            </>
          ) : errorMsg ? (
            <>
              <AlertCircle size={48} className="text-rose-500 mb-6" />
              <h1 className="text-xl font-bold text-slate-800 mb-4">Đã xảy ra lỗi</h1>
              <div className="w-full bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg text-sm mb-6 text-left">
                {errorMsg}
              </div>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
              >
                Thử lại
              </button>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center h-auto sm:h-16 py-3 sm:py-0 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-md shrink-0">
                <Users size={24} />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-xl font-bold text-slate-800 leading-tight">Hệ thống Quản lý Vị trí Công việc</h1>
                <p className="text-xs text-slate-500 font-medium truncate w-full">
                  Tổng số: {data.length} vị trí đã được đồng bộ
                </p>
              </div>
            </div>
            {/* Đã xóa nút "Đổi nguồn dữ liệu" theo yêu cầu */}
            <div className="text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0">
              <Check size={16} /> Đã đồng bộ trực tiếp
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 pb-px">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-5 py-3 font-medium text-sm rounded-t-lg transition-colors relative ${
              activeTab === 'list' 
                ? 'text-blue-700 bg-white border-t border-x border-slate-200' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileText size={18} />
            Danh sách vị trí
            {activeTab === 'list' && <span className="absolute bottom-[-1px] left-0 w-full h-px bg-white"></span>}
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-2 px-5 py-3 font-medium text-sm rounded-t-lg transition-colors relative ${
              activeTab === 'compare' 
                ? 'text-blue-700 bg-white border-t border-x border-slate-200' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Columns size={18} />
            So sánh vị trí
            {activeTab === 'compare' && <span className="absolute bottom-[-1px] left-0 w-full h-px bg-white"></span>}
          </button>
        </div>

        {/* Tab 1: Danh sách */}
        {activeTab === 'list' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm theo bất kỳ thông tin nào..." 
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="text-sm text-slate-500">
                Hiển thị <span className="font-semibold text-slate-800">{filteredData.length}</span> kết quả
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <th className="py-3 px-4 font-semibold text-sm text-slate-600 w-12 text-center">STT</th>
                      {displayColumns.map(col => (
                        <th key={col} className="py-3 px-4 font-semibold text-sm text-slate-600 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                      <th className="py-3 px-4 font-semibold text-sm text-slate-600 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="py-3 px-4 text-sm text-slate-500 text-center">{idx + 1}</td>
                        {displayColumns.map(col => (
                          <td key={col} className="py-3 px-4 text-sm text-slate-800">
                            <div className="line-clamp-2">{row[col]}</div>
                          </td>
                        ))}
                        <td className="py-3 px-4 text-sm text-right">
                          <button 
                            onClick={() => setSelectedDetail(row)}
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 justify-end ml-auto"
                          >
                            <Info size={16} />
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredData.length === 0 && (
                      <tr>
                        <td colSpan={displayColumns.length + 2} className="py-12 text-center text-slate-500">
                          Không tìm thấy kết quả nào phù hợp với từ khóa tìm kiếm.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: So sánh */}
        {activeTab === 'compare' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Chọn Vị trí 1 */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Vị trí thứ 1</label>
                <select 
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={comparePos1Index}
                  onChange={(e) => setComparePos1Index(e.target.value)}
                >
                  <option value="">-- Chọn một vị trí --</option>
                  {data.map((item) => (
                    <option key={`pos1-${item._originalIndex}`} value={item._originalIndex}>
                      {getDisplayLabel(item)}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Chọn Vị trí 2 */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Vị trí thứ 2</label>
                <select 
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-slate-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={comparePos2Index}
                  onChange={(e) => setComparePos2Index(e.target.value)}
                >
                  <option value="">-- Chọn một vị trí --</option>
                  {data.map((item) => (
                    <option key={`pos2-${item._originalIndex}`} value={item._originalIndex}>
                      {getDisplayLabel(item)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {comparePos1Index !== '' && comparePos2Index !== '' ? (
              <div className="mt-8 border border-slate-200 rounded-xl overflow-hidden animate-in fade-in">
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <ArrowRightLeft size={18} className="text-blue-600"/> 
                    Kết quả so sánh
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900 transition-colors">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        checked={hideEmptyCompare}
                        onChange={(e) => setHideEmptyCompare(e.target.checked)}
                      />
                      Ẩn thuộc tính trống
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900 transition-colors">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        checked={hideIdenticalCompare}
                        onChange={(e) => setHideIdenticalCompare(e.target.checked)}
                      />
                      Ẩn thông tin giống nhau
                    </label>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/50">
                        <th className="py-4 px-4 font-semibold text-sm text-slate-600 w-1/4 border-b border-r border-slate-200">
                          Thuộc tính đánh giá
                        </th>
                        <th className="py-4 px-4 font-bold text-base text-blue-700 w-3/8 border-b border-r border-slate-200 bg-blue-50/30">
                          {getDisplayLabel(data.find(d => d._originalIndex.toString() === comparePos1Index))}
                        </th>
                        <th className="py-4 px-4 font-bold text-base text-teal-700 w-3/8 border-b border-slate-200 bg-teal-50/30">
                          {getDisplayLabel(data.find(d => d._originalIndex.toString() === comparePos2Index))}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {headers.map((header, idx) => {
                        const pos1 = data.find(d => d._originalIndex.toString() === comparePos1Index);
                        const pos2 = data.find(d => d._originalIndex.toString() === comparePos2Index);
                        const val1 = pos1?.[header] || '';
                        const val2 = pos2?.[header] || '';
                        
                        // Bỏ qua nếu cả 2 đều trống và người dùng chọn ẩn
                        if (hideEmptyCompare && !val1 && !val2) return null;
                        
                        // Bỏ qua nếu thông tin giống nhau và người dùng chọn ẩn
                        if (hideIdenticalCompare && val1 === val2) return null;
                        
                        // Kiểm tra khác biệt
                        const isDiff = val1 !== val2;
                        const diffResult = isDiff ? getWordDiff(val1, val2) : null;

                        return (
                          <tr key={idx} className={`border-b transition-all ${isDiff ? 'bg-orange-50/80 border-l-4 border-l-orange-500' : 'border-slate-100 hover:bg-slate-50/50 border-l-4 border-l-transparent'}`}>
                            <td className="py-3 px-4 text-sm font-medium text-slate-700 border-r border-slate-200 align-top">
                              <div className="flex flex-col items-start gap-1">
                                <span>{header}</span>
                                {isDiff && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                    Khác biệt
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className={`py-3 px-4 text-sm align-top whitespace-pre-wrap border-r border-slate-200 ${isDiff ? 'text-rose-900' : 'text-slate-800'}`}>
                              {isDiff ? (
                                <DiffViewer diffs={diffResult.diff1} type="old" />
                              ) : (
                                val1 ? val1 : <span className="text-slate-300 italic font-normal">- Không có dữ liệu -</span>
                              )}
                            </td>
                            <td className={`py-3 px-4 text-sm align-top whitespace-pre-wrap ${isDiff ? 'text-emerald-900' : 'text-slate-800'}`}>
                              {isDiff ? (
                                <DiffViewer diffs={diffResult.diff2} type="new" />
                              ) : (
                                val2 ? val2 : <span className="text-slate-300 italic font-normal">- Không có dữ liệu -</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Columns className="mx-auto text-slate-300 mb-3" size={48} />
                <p className="text-slate-500 font-medium">Vui lòng chọn cả hai vị trí ở trên để bắt đầu so sánh</p>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Modal Xem chi tiết 1 vị trí */}
      {selectedDetail && (
        <DetailModal 
          detail={selectedDetail} 
          onClose={() => setSelectedDetail(null)} 
          headers={headers} 
          getDisplayLabel={getDisplayLabel} 
        />
      )}
    </div>
  );
}
