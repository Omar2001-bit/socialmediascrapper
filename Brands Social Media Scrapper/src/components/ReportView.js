const { useMemo } = React;

const VALID_PLATFORMS = [
  "Facebook", "Twitter", "Instagram", "LinkedIn", "TikTok", "YouTube", "Pinterest", "Snapchat", "Threads"
];

const PLATFORM_ICONS = {
  Facebook: "📘",
  Twitter: "🐦",
  Instagram: "📸",
  LinkedIn: "💼",
  TikTok: "🎵",
  YouTube: "▶️",
  Pinterest: "📌",
  Snapchat: "👻",
  Threads: "🧵"
};

window.ReportView = function ReportView({ results = [], status = 'idle' }) {
  const stats = useMemo(() => {
    let totalProcessed = results.length;
    let totalLinksFound = 0;
    let successfulSites = 0;
    
    // Initialize platform counts
    const platformCounts = VALID_PLATFORMS.reduce((acc, p) => {
      acc[p] = 0;
      return acc;
    }, {});

    results.forEach(r => {
      let foundLink = false;
      if (r.socials) {
        Object.entries(r.socials).forEach(([platform, url]) => {
          if (url && typeof url === 'string' && url.startsWith('http')) {
            totalLinksFound++;
            foundLink = true;
            if (platformCounts[platform] !== undefined) {
              platformCounts[platform]++;
            }
          }
        });
      }
      if (r.status === 'ok' && foundLink) {
        successfulSites++;
      }
    });

    const successRate = totalProcessed > 0 
      ? Math.round((successfulSites / totalProcessed) * 100) 
      : 0;

    return { totalProcessed, totalLinksFound, successRate, platformCounts };
  }, [results]);

  if (status === 'idle' || status === 'parsing' || status === 'ready') {
    return null; // Don't show report zone until running or done
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto p-4 text-slate-800 font-sans">
      
      {/* Summary Stats Bar */}
      <div className="flex flex-col gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold m-0 text-slate-900">Summary Statistics</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center">
            <span className="text-sm text-slate-500 font-medium uppercase tracking-wider">Processed</span>
            <span className="text-3xl font-bold text-slate-800 mt-1">{stats.totalProcessed}</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center">
            <span className="text-sm text-slate-500 font-medium uppercase tracking-wider">Total Links</span>
            <span className="text-3xl font-bold text-blue-600 mt-1">{stats.totalLinksFound}</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center">
            <span className="text-sm text-slate-500 font-medium uppercase tracking-wider">Success Rate</span>
            <span className="text-3xl font-bold text-emerald-600 mt-1">{stats.successRate}%</span>
          </div>
        </div>

        {/* Platform Presence Bar */}
        <div className="mt-2 pt-4 border-t border-slate-100">
          <p className="text-sm text-slate-500 font-medium mb-3">Platform Coverage</p>
          <div className="flex flex-wrap gap-2">
            {VALID_PLATFORMS.map(platform => (
              <div key={platform} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-md text-sm border border-slate-200">
                <span className="font-semibold text-slate-700">{PLATFORM_ICONS[platform] || platform.substring(0,2)}</span>
                <span className="text-slate-600">{platform}</span>
                <span className="ml-1 bg-white px-2 py-0.5 rounded text-xs font-bold text-slate-800 border border-slate-200 shadow-sm">
                  {stats.platformCounts[platform]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold m-0 flex items-center justify-between text-slate-900">
          <span>Site Results</span>
          {status === 'running' && (
            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded animate-pulse">Running...</span>
          )}
        </h3>
        
        {results.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            Waiting for results...
          </div>
        ) : (
          results.map((result, idx) => (
            <ResultCard key={idx} result={result} />
          ))
        )}
      </div>

    </div>
  );
}

function ResultCard({ result }) {
  const getBadgeStyle = (status) => {
    switch (status) {
      case 'ok': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'no_links': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'unreachable':
      case 'error':
      case 'parse_error': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getBadgeLabel = (status) => {
    if (status === 'ok') return 'found';
    if (status === 'no_links') return 'no links';
    return status.replace('_', ' ');
  };

  const socials = result.socials || {};
  const platformsFound = Object.keys(socials).filter(k => 
    typeof socials[k] === 'string' && socials[k].startsWith('http')
  );

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-base font-bold text-slate-900 m-0">{result.name || "Unknown Brand"}</h4>
          <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:text-blue-700 hover:underline">
            {result.url}
          </a>
        </div>
        <div className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded border ${getBadgeStyle(result.status)}`}>
          {getBadgeLabel(result.status)}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
        {platformsFound.length > 0 ? (
          platformsFound.map(platform => (
            <a
              key={platform}
              href={socials[platform]}
              target="_blank"
              rel="noopener noreferrer"
              title={`${platform} Profile`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-sm text-slate-700 transition-colors shadow-sm"
            >
              <span className="font-bold">{PLATFORM_ICONS[platform] || platform.substring(0,2)}</span>
              <span>{platform}</span>
            </a>
          ))
        ) : (
          <span className="text-sm text-slate-400 italic">No social links found</span>
        )}
      </div>
    </div>
  );
}
