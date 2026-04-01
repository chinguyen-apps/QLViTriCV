import React, { useState, useMemo, useEffect } from 'react';
import { Users, Columns, FileText, Search, X, Check, ArrowRightLeft, Info, FileSpreadsheet, ChevronUp, ChevronDown, Loader2, AlertCircle, Target, BookOpen, Award, ListChecks, Briefcase, GraduationCap } from 'lucide-react';

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

// Cập nhật: Chỉ highlight và in đậm, không gạch ngang
function DiffViewer({ diffs, type }) {
  return (
    <React.Fragment>
      {diffs.map((part, i) => {
        if (part.type === 'common') {
          return <span key={i}>{part.value}</span>;
        }
        // Trường hợp văn bản bị loại bỏ ở vị trí 1 so với vị trí 2
        if (part.type === 'removed' && type === 'old') {
          return (
            <span key={i} className="bg-red-100 text-red-700 font-bold rounded-sm px-0.5">
              {part.value}
            </span>
          );
        }
        // Trường hợp văn bản được thêm mới ở vị trí 2 so với vị trí 1
        if (part.type === 'added' && type === 'new') {
          return (
            <span key={i} className="bg-emerald-100 text-emerald-800 font-bold rounded-sm px-0.5">
              {part.value}
            </span>
          );
        }
        return null;
      })}
    </React.Fragment>
  );
}

// Component hiển thị từng nhóm thông tin ở Sidebar
const SidebarSection = ({ title, icon: Icon, items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-100/80 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
        <Icon size={16} className="text-blue-600" />
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-4 space-y-4">
        {items.map(({ header, val }) => (
          <div key={header} className="flex flex-col">
            <span className="text-xs font-bold text-slate-600 uppercase mb-1">{header}</span>
            <span className="text-sm text-slate-900 font-medium leading-snug whitespace-pre-wrap">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CompetencyTableSection = ({ title, icon: Icon, items, colLabel = "Tên năng lực" }) => {
  if (!items || items.length === 0) return null;

  const hasAnyLevelHeader = items.some(item => item.header.toLowerCase().includes('cấp') || item.header.toLowerCase().includes('mức') || item.header.toLowerCase().includes('điểm'));
  
  let pairs = [];
  if (hasAnyLevelHeader) {
      for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const isLevelHeader = item.header.toLowerCase().includes('cấp') || item.header.toLowerCase().includes('mức') || item.header.toLowerCase().includes('điểm');
          
          if (isLevelHeader) {
             if (pairs.length > 0 && pairs[pairs.length - 1].level === '-') {
                 pairs[pairs.length - 1].level = item.val;
             } else {
                 pairs.push({ name: '-', level: item.val });
             }
          } else {
             pairs.push({ name: item.val, level: '-' });
          }
      }
  } else {
      for (let i = 0; i < items.length; i += 2) {
          pairs.push({
              name: items[i]?.val || '-',
              level: items[i+1]?.val || '-'
          });
      }
  }

  const validPairs = pairs.filter(p => p.name !== '-' || p.level !== '-');
  if (validPairs.length === 0) return null;

  return (
    <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-100/80 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
        <Icon size={16} className="text-blue-600" />
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="py-2.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider border-r border-slate-200 w-2/3">{colLabel}</th>
              <th className="py-2.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider text-center">Cấp độ cần đạt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {validPairs.map((pair, idx) => (
              <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                <td className="py-3 px-4 text-sm text-slate-800 border-r border-slate-100 font-medium leading-snug">{pair.name}</td>
                <td className="py-3 px-4 text-sm text-blue-700 font-bold text-center bg-blue-50/30 whitespace-nowrap">{pair.level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function DetailModal({ detail, onClose, headers, getDisplayLabel }) {
  const taskMap = {};
  const roleInfos = [];
  const generalInfos = [];
  const standardInfos = [];
  const generalCompetencies = [];
  const proCompetencies = [];

  headers.forEach(header => {
    const val = detail[header];
    if (!val) return;

    const lower = header.toLowerCase();
    const isTask = lower.includes('nhiệm vụ') && /\d/.test(header);
    const isDeliverable = (lower.includes('sản phẩm') || lower.includes('kết quả')) && /\d/.test(header);
    const numMatch = header.match(/(\d+)/);

    let displayVal = val;

    if (lower.includes('kinh nghiệm')) {
      if (!val.toLowerCase().includes('năm') && val.match(/\d/)) {
        displayVal = `${val.trim()} năm kinh nghiệm`;
      }
    }

    if (lower.includes('vai trò') || lower.includes('mục tiêu')) {
      roleInfos.push({ header, val: displayVal });
    } else if (isTask && numMatch) {
      const id = numMatch[1];
      if (!taskMap[id]) taskMap[id] = {};
      taskMap[id].task = { header, val: displayVal };
    } else if (isDeliverable && numMatch) {
      const id = numMatch[1];
      if (!taskMap[id]) taskMap[id] = {};
      taskMap[id].deliverable = { header, val: displayVal };
    } else if (lower.match(/trình độ|học vấn|chuyên ngành|ngoại ngữ|tin học|kiến thức|kinh nghiệm|tiếng anh|cntt|chuyên môn/)) {
      if (lower.includes('năng lực')) {
          proCompetencies.push({ header, val: displayVal });
      } else {
          standardInfos.push({ header, val: displayVal });
      }
    } else if (lower.match(/mã|vị trí|khối|đơn vị|phòng|nhóm|chức danh|báo cáo|quan hệ|ghi chú/)) {
      generalInfos.push({ header, val: displayVal });
    } else {
      generalCompetencies.push({ header, val: displayVal });
    }
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden border border-slate-300">
        
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm z-20 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" />
            Bảng Mô tả Vị trí: <span className="text-blue-600">{getDisplayLabel(detail)}</span>
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="w-full md:w-1/3 xl:w-1/4 bg-slate-50 border-r border-slate-200 p-4 md:p-6 overflow-y-auto custom-scrollbar">
            <SidebarSection title="Thông tin chung" icon={Briefcase} items={generalInfos} />
            <SidebarSection title="Tiêu chuẩn đầu vào" icon={GraduationCap} items={standardInfos} />
            
            {generalCompetencies.length > 0 && (
                <CompetencyTableSection 
                    title="Năng lực chung" 
                    icon={Award} 
                    items={generalCompetencies} 
                    colLabel="Năng lực chung"
                />
            )}
            
            {proCompetencies.length > 0 && (
                <CompetencyTableSection 
                    title="Năng lực chuyên môn" 
                    icon={BookOpen} 
                    items={proCompetencies} 
                    colLabel="Năng lực chuyên môn"
                />
            )}
          </div>

          <div className="w-full md:w-2/3 xl:w-3/4 bg-white p-4 md:p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-10">
              {roleInfos.length > 0 && (
                <section>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
                    <Target className="text-blue-600" /> Vai trò & Mục tiêu
                  </h3>
                  <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100 shadow-sm">
                    {roleInfos.map(({ header, val }) => (
                      <div key={header} className="mb-4 last:mb-0">
                        {roleInfos.length > 1 && <h4 className="font-semibold text-blue-800 mb-2">{header}</h4>}
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{val}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {Object.keys(taskMap).length > 0 && (
                <section>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
                    <ListChecks className="text-blue-600" /> Nhiệm vụ trọng tâm & Sản phẩm bàn giao
                  </h3>
                  <div className="space-y-5">
                    {Object.keys(taskMap).sort((a,b)=>Number(a)-Number(b)).map(id => {
                      const item = taskMap[id];
                      return (
                        <div key={id} className="group flex flex-col xl:flex-row rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                          <div className="hidden xl:flex w-14 bg-blue-600 items-start justify-center pt-5 shrink-0">
                            <span className="text-white font-black text-xl opacity-90">{id}</span>
                          </div>
                          
                          <div className="flex-1 flex flex-col xl:flex-row">
                            <div className="flex-1 p-5 lg:p-6 bg-white border-b xl:border-b-0 xl:border-r border-slate-200 group-hover:bg-blue-50/30 transition-colors">
                              <div className="xl:hidden inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold mb-3">
                                #{id}
                              </div>
                              <span className="text-xs font-bold uppercase text-blue-800 mb-3 block tracking-wide">
                                {item.task?.header || `Nhiệm vụ ${id}`}
                              </span>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                {item.task?.val || <span className="text-slate-400 italic">Không có nội dung</span>}
                              </p>
                            </div>
                            
                            <div className="flex-1 p-5 lg:p-6 bg-slate-50 group-hover:bg-emerald-50/30 transition-colors">
                              <span className="text-xs font-bold uppercase text-emerald-700 mb-3 block tracking-wide">
                                {item.deliverable?.header || `Sản phẩm bàn giao ${id}`}
                              </span>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                {item.deliverable?.val || <span className="text-slate-400 italic">Không có nội dung</span>}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end shrink-0 z-20">
          <button 
            onClick={onClose}
            className="px-8 py-2.5 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 transition-colors shadow-sm focus:ring-2 focus:ring-slate-400 focus:outline-none"
          >
            Đóng bảng
          </button>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: #94a3b8; }
      `}} />
    </div>
  );
}

export default function App() {
  const HARDCODED_URL = "https://docs.google.com/spreadsheets/d/1WKNcq0edkaMJid_m1Mwtu4EBQawl1SGT/edit?pli=1&gid=323641730#gid=323641730";

  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [activeTab, setActiveTab] = useState('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [selectedDetail, setSelectedDetail] = useState(null);

  const [comparePos1Index, setComparePos1Index] = useState('');
  const [comparePos2Index, setComparePos2Index] = useState('');
  const [hideEmptyCompare, setHideEmptyCompare] = useState(true);
  const [hideIdenticalCompare, setHideIdenticalCompare] = useState(false);

  useEffect(() => {
    handleLoadSheet();
  }, []);

  const handleLoadSheet = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setIsDataLoaded(false); 

    try {
      let fetchUrl = HARDCODED_URL;
      let id = '', gid = '0';
      
      const idMatch = fetchUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (idMatch) id = idMatch[1];
      const gidMatch = fetchUrl.match(/[#&]gid=([0-9]+)/);
      if (gidMatch) gid = gidMatch[1];

      if (!id) throw new Error("Đường link Database không hợp lệ.");

      const urlGviz = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;
      const urlExport = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;

      let text = '';
      let fetchSuccess = false;

      try {
        const res = await fetch(urlGviz);
        if (res.ok) { text = await res.text(); fetchSuccess = true; }
      } catch (e) {}

      if (!fetchSuccess) {
        try {
          const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(urlGviz)}`);
          if (res.ok) { text = await res.text(); fetchSuccess = true; }
        } catch (e) {}
      }

      if (!fetchSuccess) {
        try {
          const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(urlExport)}`);
          if (res.ok) { text = await res.text(); fetchSuccess = true; }
        } catch (e) {}
      }

      if (!fetchSuccess || !text) {
        throw new Error("Mất kết nối với máy chủ Google. Vui lòng kiểm tra lại thiết lập bảo mật mạng.");
      }

      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

      if (text.trim().toLowerCase().startsWith('<!doctype html>') || text.trim().toLowerCase().startsWith('<html')) {
        throw new Error("Truy cập bị chặn bởi Firewall. Vui lòng cấp quyền chia sẻ ở trạng thái 'Bất kỳ ai có liên kết'.");
      }

      const rows = parseCSV(text);
      if (!rows || rows.length < 2) {
        throw new Error("Bảng dữ liệu trống hoặc bị hỏng phân vùng.");
      }

      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(20, rows.length); i++) {
        const filledCellsCount = rows[i].filter(cell => cell && cell.trim() !== '').length;
        if (filledCellsCount >= 3) {
          headerRowIdx = i;
          break;
        }
      }
      
      if (headerRowIdx === -1) headerRowIdx = 0;

      const rawHeaders = rows[headerRowIdx];
      const headersMap = [];
      const newHeaders = [];
      
      rawHeaders.forEach((h, idx) => {
        let name = h ? h.trim().replace(/^\uFEFF/, '').replace(/[\r\n]+/g, ' ') : '';
        if (name && !newHeaders.includes(name)) {
          newHeaders.push(name);
          headersMap.push({ index: idx, name: name });
        } else if (name) {
          let count = 1;
          while (newHeaders.includes(`${name} (${count})`)) count++;
          let newName = `${name} (${count})`;
          newHeaders.push(newName);
          headersMap.push({ index: idx, name: newName });
        }
      });

      if (newHeaders.length === 0) {
        throw new Error("Không thể biên dịch các Cột tiêu đề.");
      }

      const newData = rows.slice(headerRowIdx + 1).map((row, i) => {
        let obj = { _originalIndex: i };
        let hasValue = false;
        
        headersMap.forEach(hm => {
          let val = row[hm.index] ? row[hm.index].trim() : '';
          obj[hm.name] = val;
          if (val !== '') hasValue = true;
        });
        
        return hasValue ? obj : null;
      }).filter(item => item !== null);

      if (newData.length === 0) {
        throw new Error("Không thể trích xuất các bản ghi hợp lệ từ File hệ thống.");
      }

      setHeaders(newHeaders);
      setData(newData);
      setIsDataLoaded(true);

    } catch (err) {
      console.error("Lỗi:", err);
      setErrorMsg(err.message);
      setIsDataLoaded(false); 
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

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative">
        <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 text-center flex flex-col items-center">
          {isLoading ? (
            <>
              <Loader2 size={48} className="animate-spin text-blue-600 mb-6" />
              <h1 className="text-xl font-bold text-slate-800 mb-2">Đang tải dữ liệu</h1>
              <p className="text-slate-500 text-sm">Hệ thống đang đồng bộ dữ liệu vị trí công việc từ Google Sheets, vui lòng đợi trong giây lát...</p>
            </>
          ) : errorMsg ? (
            <>
              <AlertCircle size={48} className="text-red-500 mb-6" />
              <h1 className="text-xl font-bold text-slate-800 mb-4">Đã xảy ra lỗi</h1>
              <div className="w-full bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm mb-6 text-left whitespace-pre-wrap leading-relaxed">
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center h-auto sm:h-16 py-3 sm:py-0 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                <Users size={24} />
              </div>
              <div className="overflow-hidden">
                <h1 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight">
                  Quản lý Vị trí Công việc
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Tổng số: {data.length} vị trí đã được đồng bộ
                </p>
              </div>
            </div>
            <div className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0">
              <Check size={14} /> Đã đồng bộ trực tiếp
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex gap-2 mb-6 border-b border-slate-200 pb-px">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-5 py-3 font-medium text-sm rounded-t-lg transition-all relative ${
              activeTab === 'list' 
                ? 'text-blue-600 bg-white border-t border-x border-slate-200' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border-t border-x border-transparent'
            }`}
          >
            <FileText size={18} />
            Danh sách vị trí
            {activeTab === 'list' && <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-blue-600"></span>}
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-2 px-5 py-3 font-medium text-sm rounded-t-lg transition-all relative ${
              activeTab === 'compare' 
                ? 'text-blue-600 bg-white border-t border-x border-slate-200' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border-t border-x border-transparent'
            }`}
          >
            <Columns size={18} />
            So sánh vị trí
            {activeTab === 'compare' && <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-blue-600"></span>}
          </button>
        </div>

        {activeTab === 'list' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Nhập tham số tìm kiếm..." 
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400 transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="text-sm text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                Hiển thị: <span className="font-bold text-slate-800">{filteredData.length}</span> kết quả
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
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
                      <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-3 px-4 text-sm text-slate-500 text-center">{idx + 1}</td>
                        {displayColumns.map(col => (
                          <td key={col} className="py-3 px-4 text-sm text-slate-800">
                            <div className="line-clamp-2">{row[col]}</div>
                          </td>
                        ))}
                        <td className="py-3 px-4 text-sm text-right">
                          <button 
                            onClick={() => setSelectedDetail(row)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 justify-end ml-auto bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors"
                          >
                            <Info size={16} /> Chi tiết
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Vị trí thứ 1</label>
                <select 
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-slate-700 shadow-sm"
                  value={comparePos1Index}
                  onChange={(e) => setComparePos1Index(e.target.value)}
                >
                  <option value="">-- Chọn một vị trí --</option>
                  {data.map((item) => (
                    <option key={`pos1-${item._originalIndex}`} value={item._originalIndex}>{getDisplayLabel(item)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Vị trí thứ 2</label>
                <select 
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-slate-700 shadow-sm"
                  value={comparePos2Index}
                  onChange={(e) => setComparePos2Index(e.target.value)}
                >
                  <option value="">-- Chọn một vị trí --</option>
                  {data.map((item) => (
                    <option key={`pos2-${item._originalIndex}`} value={item._originalIndex}>{getDisplayLabel(item)}</option>
                  ))}
                </select>
              </div>
            </div>

            {comparePos1Index !== '' && comparePos2Index !== '' ? (
              <div className="mt-8 border border-slate-200 rounded-xl overflow-hidden animate-in slide-in-from-bottom-4">
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                    <ArrowRightLeft size={18} className="text-blue-600"/> Kết quả so sánh
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 w-4 h-4" checked={hideEmptyCompare} onChange={(e) => setHideEmptyCompare(e.target.checked)} />
                      Ẩn thuộc tính trống
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 w-4 h-4" checked={hideIdenticalCompare} onChange={(e) => setHideIdenticalCompare(e.target.checked)} />
                      Ẩn thông tin giống nhau
                    </label>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white">
                        <th className="py-4 px-4 font-semibold text-sm text-slate-600 w-1/4 border-b border-r border-slate-200 bg-slate-50">Thuộc tính</th>
                        <th className="py-4 px-4 font-bold text-base text-blue-600 w-3/8 border-b border-r border-slate-200 bg-blue-50/50">{getDisplayLabel(data.find(d => d._originalIndex.toString() === comparePos1Index))}</th>
                        <th className="py-4 px-4 font-bold text-base text-emerald-600 w-3/8 border-b border-slate-200 bg-emerald-50/50">{getDisplayLabel(data.find(d => d._originalIndex.toString() === comparePos2Index))}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {headers.map((header, idx) => {
                        const pos1 = data.find(d => d._originalIndex.toString() === comparePos1Index);
                        const pos2 = data.find(d => d._originalIndex.toString() === comparePos2Index);
                        const val1 = pos1?.[header] || '';
                        const val2 = pos2?.[header] || '';
                        
                        if (hideEmptyCompare && !val1 && !val2) return null;
                        if (hideIdenticalCompare && val1 === val2) return null;
                        
                        const isDiff = val1 !== val2;
                        const diffResult = isDiff ? getWordDiff(val1, val2) : null;

                        return (
                          <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-4 text-sm font-medium text-slate-700 border-r border-slate-200 align-top">
                              <div className="flex flex-col items-start gap-1.5">
                                <span>{header}</span>
                                {isDiff && <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-orange-100 text-orange-600 border border-orange-200">Khác biệt</span>}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-sm align-top whitespace-pre-wrap border-r border-slate-200 text-slate-800 leading-relaxed">
                              {isDiff ? <DiffViewer diffs={diffResult.diff1} type="old" /> : (val1 ? val1 : <span className="text-slate-400 italic">Trống</span>)}
                            </td>
                            <td className="py-4 px-4 text-sm align-top whitespace-pre-wrap text-slate-800 leading-relaxed">
                              {isDiff ? <DiffViewer diffs={diffResult.diff2} type="new" /> : (val2 ? val2 : <span className="text-slate-400 italic">Trống</span>)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-300">
                <Columns className="mx-auto text-slate-400 mb-4" size={48} />
                <p className="text-slate-500 font-medium text-sm">Chọn 2 vị trí để so sánh</p>
              </div>
            )}
          </div>
        )}
      </main>

      {selectedDetail && (
        <DetailModal detail={selectedDetail} onClose={() => setSelectedDetail(null)} headers={headers} getDisplayLabel={getDisplayLabel} />
      )}
    </div>
  );
}
