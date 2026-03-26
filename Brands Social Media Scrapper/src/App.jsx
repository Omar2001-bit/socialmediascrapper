const { useState, useEffect, useRef, useCallback } = React;
import { parseXLSX } from './src/agents/sheetParser.js';
import { scrapeAll } from './src/agents/scraper.js';
import { exportCSV, exportXLSX } from './src/agents/exporter.js';

// Access the ReportView component injected globally via index.html Babel tag
const ReportView = window.ReportView;

export default function App() {
  const [competitors, setCompetitors] = useState([]);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle'); // idle, parsing, ready, running, done, stopped
  const [progress, setProgress] = useState({ current: 0, total: 0, name: '' });
  const [logs, setLogs] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef(null);
  const logsEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = useCallback((msg) => {
    setLogs(prev => [...prev, msg]);
  }, []);

  const addResult = useCallback((res) => {
    setResults(prev => {
      // Create a new array with the updated result
      const newResults = [...prev];
      const index = newResults.findIndex(r => r.url === res.url && r.name === res.name);
      if (index >= 0) {
        newResults[index] = res;
      } else {
        newResults.push(res);
      }
      return newResults;
    });
    
    setProgress(prev => ({
      ...prev,
      current: prev.current + 1,
      name: res.name || res.url
    }));
  }, []);

  const handleFile = async (file) => {
    if (!file) return;
    setStatus('parsing');
    setLogs([]);
    setResults([]);
    setProgress({ current: 0, total: 0, name: '' });
    
    addLog(`Parsing file: ${file.name}...`);
    
    const { competitors: parsed, columnMap, parseError } = await parseXLSX(file);
    
    if (parseError) {
      addLog(`Error: ${parseError}`);
      setStatus('idle');
      return;
    }
    
    if (parsed.length === 0) {
      addLog('Error: No clear competitors found in sheet.');
      setStatus('idle');
      return;
    }

    addLog(`Found columns - Name: "${columnMap.nameCol}", URL: "${columnMap.urlCol}"`);
    addLog(`Loaded ${parsed.length} competitors. Ready to scrape.`);
    
    setCompetitors(parsed);
    setStatus('ready');
  };

  const onDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const startScraping = async () => {
    setStatus('running');
    setResults([]);
    setProgress({ current: 0, total: competitors.length, name: competitors[0]?.name || '' });
    
    abortControllerRef.current = new AbortController();
    
    await scrapeAll(competitors, addResult, addLog, abortControllerRef.current.signal);
    
    if (!abortControllerRef.current.signal.aborted) {
      setStatus('done');
      addLog('Run complete.');
    } else {
      setStatus('stopped');
    }
  };

  const stopScraping = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      addLog('Stopping run after current item finishes...');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 flex flex-col gap-6">
      
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold text-slate-900">Competitor Social Scraper</h1>
        <p className="text-slate-500 mt-2">Upload a spreadsheet of competitors to automatically extract their social media profiles.</p>
      </div>

      {/* Zone 1: File Upload */}
      {(status === 'idle' || status === 'parsing' || status === 'ready') && (
        <div 
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:border-slate-400'}`}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <input 
            type="file" 
            accept=".xlsx,.xls" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={(e) => handleFile(e.target.files[0])}
          />
          
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 rounded-full bg-slate-100 text-slate-500">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            {status === 'parsing' ? (
              <p className="text-slate-700 font-medium">Parsing file...</p>
            ) : status === 'ready' ? (
              <div className="flex flex-col items-center">
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-bold rounded-full border border-green-200">
                  Ready: {competitors.length} sites loaded
                </span>
                <button 
                  onClick={() => fileInputRef.current.click()}
                  className="mt-4 text-sm text-blue-600 hover:underline"
                >
                  Choose a different file
                </button>
              </div>
            ) : (
              <>
                <p className="text-slate-700 font-medium">Drag & drop your .xlsx file here</p>
                <p className="text-slate-500 text-sm">or click to browse</p>
                <button 
                  onClick={() => fileInputRef.current.click()}
                  className="mt-2 px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Select File
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Zone 2: Control Bar */}
      {status !== 'idle' && status !== 'parsing' && (
        <div className="flex flex-col items-center p-6 bg-white border border-slate-200 rounded-xl shadow-sm gap-4">
          {status === 'ready' && (
            <button 
              onClick={startScraping}
              className="w-full max-w-md py-3 bg-slate-900 text-white rounded-lg font-semibold shadow-md hover:bg-slate-800 transition-colors"
            >
              Start scraping {competitors.length} sites
            </button>
          )}

          {status === 'running' && (
            <div className="flex flex-col items-center w-full gap-2 text-center">
              <button disabled className="w-full max-w-md py-3 bg-slate-300 text-slate-500 rounded-lg font-semibold cursor-not-allowed">
                Running...
              </button>
              <button onClick={stopScraping} className="text-sm text-rose-600 hover:text-rose-800 font-medium mt-1">
                Stop scrape
              </button>
            </div>
          )}

          {(status === 'done' || status === 'stopped') && (
            <div className="flex flex-col items-center w-full gap-4 text-center">
              <button 
                onClick={startScraping}
                className="w-full max-w-md py-3 bg-white border-2 border-slate-900 text-slate-900 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
              >
                Re-run scrape
              </button>
              <div className="flex gap-4">
                <button 
                  onClick={() => exportCSV(results)}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-md font-medium shadow-sm hover:bg-emerald-700"
                >
                  Export CSV
                </button>
                <button 
                  onClick={() => exportXLSX(results)}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-md font-medium shadow-sm hover:bg-emerald-700"
                >
                  Export XLSX
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Zone 3: Progress & Logs */}
      {logs.length > 0 && (
        <div className="flex flex-col gap-2">
          {status === 'running' && progress.total > 0 && (
            <div className="w-full">
              <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1 px-1 uppercase tracking-wider">
                <span>Scraping {progress.name}</span>
                <span>{progress.current} of {progress.total}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="bg-slate-900 rounded-lg p-3 h-40 overflow-y-auto text-xs font-mono text-slate-300 shadow-inner">
            {logs.map((log, i) => (
              <div key={i} className="mb-1 leading-relaxed opacity-80">{log}</div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* Zone 4: Results */}
      {status !== 'idle' && status !== 'parsing' && status !== 'ready' && (
        <ReportView results={results} status={status} />
      )}
      
    </div>
  );
}

// Render the application
const rootNode = document.getElementById('root');
const root = ReactDOM.createRoot(rootNode);
root.render(<App />);
