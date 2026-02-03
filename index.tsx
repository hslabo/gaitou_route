import React, { useState, CSSProperties, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';

// --- Types ---
interface ScheduleItem {
  action: '移動' | '演説' | '食事';
  location: string;
  startTime: string;
  endTime: string;
}

interface Source {
  uri: string;
  title: string;
}

// A custom hook to get window width
const useWindowWidth = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowWidth;
};


// --- Styles ---
const getStyles = (isMobile: boolean): { [key: string]: CSSProperties } => ({
  appContainer: {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    gap: '24px',
    width: '100%',
    maxWidth: '1200px',
    alignItems: 'flex-start',
  },
  controlPanel: {
    width: isMobile ? '100%' : '350px',
    flexShrink: 0,
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    padding: '24px',
    boxSizing: 'border-box',
  },
  resultsPanel: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
    boxSizing: 'border-box',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    padding: '24px',
  },
  header: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#1c1e21',
    marginBottom: '20px',
    borderBottom: '1px solid #ddd',
    paddingBottom: '10px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontWeight: 600,
    marginBottom: '8px',
    color: '#606770',
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ccd0d5',
    fontSize: '16px',
    boxSizing: 'border-box',
  },
  checkboxContainer: {
    maxHeight: isMobile ? '200px' : '300px',
    overflowY: 'auto',
    border: '1px solid #ccd0d5',
    borderRadius: '6px',
    padding: '10px',
  },
  districtGroup: {
    border: 'none',
    padding: 0,
    margin: 0,
  },
  districtGroupHeader: {
    fontSize: '1em',
    fontWeight: 600,
    color: '#1c1e21',
    paddingBottom: '5px',
    borderBottom: '1px solid #e9ebee',
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: '8px',
    paddingLeft: 0,
    marginTop: '10px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    padding: '2px 0 2px 10px',
  },
  checkbox: {
    marginRight: '8px',
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#1877f2',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  buttonDisabled: {
    backgroundColor: '#a0a0a0',
    cursor: 'not-allowed',
  },
  loaderContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    flexDirection: 'column',
    gap: '10px'
  },
  loader: {
    border: '5px solid #f3f3f3',
    borderTop: '5px solid #1877f2',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
  },
  error: {
    color: '#d32f2f',
    backgroundColor: '#ffebee',
    padding: '15px',
    borderRadius: '6px',
    textAlign: 'center',
  },
  placeholder: {
    textAlign: 'center',
    padding: '40px',
    color: '#606770',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    backgroundColor: '#f5f6f7',
    padding: '12px',
    textAlign: 'left',
    borderBottom: '2px solid #ddd',
    color: '#606770',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #e9ebee',
  },
  sourceList: {
    listStyleType: 'decimal',
    paddingLeft: '20px',
  },
  sourceItem: {
    marginBottom: '8px',
  },
  sourceLink: {
    color: '#1877f2',
    textDecoration: 'none',
  },
});

// --- Main App Component ---
const App: React.FC = () => {
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 800;
  const styles = getStyles(isMobile);

  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [totalSpeeches, setTotalSpeeches] = useState<string>('8');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const UEDA_DISTRICTS_GROUPED = {
    '上田地域（旧上田市中心部）': ['大手', '中央', '中央西', '中央北', '天神', '常田', '緑が丘', '材木町', '常磐城', '国分', '踏入', '住吉'],
    '上田地域（城南・川辺）': ['城南', '房山', '上田', '常入', '秋和'],
    '上田地域（神科・豊殿）': ['神科', '上塩尻', '金井', '下塩尻', '岡', '伊勢山', '染屋'],
    '上田地域（塩田地区）': ['下之郷', '生田', '神畑', '古里', '上野', '築地', '芳田', '仁古田', '林之郷', '古安曽', '舞田', '八木沢', '手塚', '富士山', '別所温泉', '五加', '中野', '小泉', '保野', '石井', '山田', '福田', '前山'],
    '丸子地域': ['東内', '西内', '平井', '御屋敷', '中丸子', '上丸子', '下丸子', '腰越', '藤原田', '長瀬', '和子', '御岳堂', '塩川', '大屋', '小屋', '中塩', '下塩', '上本木', '下本木'],
    '真田地域': ['本原', '横沢', '大日向', '戸沢', '渋沢', '殿城', '横尾', '戸石', '真田', '長', '傍陽', '石舟', '大倉', '菅平'],
    '武石地域': ['上武石', '下武石', '沖', '鳥屋', '上岡', '下岡', '余里', '権現'],
  };

  const allDistricts = Object.values(UEDA_DISTRICTS_GROUPED).flat();

  const handleSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedDistricts(allDistricts);
    } else {
      setSelectedDistricts([]);
    }
  };

  const handleDistrictChange = (district: string) => {
    setSelectedDistricts(prev => 
      prev.includes(district) 
        ? prev.filter(d => d !== district)
        : [...prev, district]
    );
  };

  const generateRoute = async () => {
    if (selectedDistricts.length === 0) {
      setError('少なくとも1つの地区を選択してください。');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSchedule([]);
    setSources([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      const prompt = `あなたは日本の選挙キャンペーンの優秀なルートプランナーです。長野県上田市での街頭演説のスケジュールを作成してください。

# 制約条件
- 訪問地区: ${selectedDistricts.join('、')}
- 総演説回数: ${totalSpeeches}回程度
- 活動時間: ${startTime} から ${endTime} まで

# 指示
1.  Google検索を使い、指定された各地区で過去に街頭演説が行われた場所を調べてください。実績のある場所を最優先でスケジュールに組み込んでください。
2.  もし過去の実績地が見つからない場合は、地区の市役所、主要駅、大型スーパーマーケット（例：アリオ上田、イオン上田店）、交通量の多い交差点などを演説場所として提案してください。
3.  移動時間（地区間の移動は車で平均15分と仮定）、演説時間（1回あたり20分）、そして昼食休憩（12時から13時の間に45分間）を考慮した、現実的なタイムスケジュールを作成してください。
4.  出力は、必ず以下のJSON配列形式で、スケジュール全体を単一のJSONオブジェクトとして返してください。JSON以外の説明文や前置きは一切含めないでください。

# JSON出力フォーマット
[
{"action": "演説", "location": "具体的な場所の名前", "startTime": "HH:MM", "endTime": "HH:MM"},
{"action": "移動", "location": "次の場所へ移動", "startTime": "HH:MM", "endTime": "HH:MM"},
{"action": "食事", "location": "昼食休憩", "startTime": "HH:MM", "endTime": "HH:MM"}
]`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      let responseText = response.text.trim();
      const jsonStart = responseText.indexOf('[');
      const jsonEnd = responseText.lastIndexOf(']');
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonString = responseText.substring(jsonStart, jsonEnd + 1);
        try {
          const parsedSchedule: ScheduleItem[] = JSON.parse(jsonString);
          setSchedule(parsedSchedule);
        } catch (e) {
          console.error("Failed to parse JSON response:", jsonString, e);
          setError("AIからの応答を解析できませんでした。形式が正しくない可能性があります。");
        }
      } else {
         setError("AIからの応答に有効なスケジュールデータが見つかりませんでした。");
      }
      
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      if (groundingMetadata?.groundingChunks) {
        const extractedSources = groundingMetadata.groundingChunks
          .map((chunk: any) => chunk.web)
          .filter((web: any) => web?.uri && web?.title);
        setSources(extractedSources);
      }

    } catch (err) {
      console.error("Error generating route:", err);
      setError("ルートの生成中にエラーが発生しました。しばらくしてからもう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };
  
  const renderResults = () => {
    if (loading) {
      return (
        <div style={styles.loaderContainer}>
          <div style={styles.loader}></div>
          <p>AIが最適なルートを検索・作成中です...</p>
        </div>
      );
    }
    if (error) {
      return <div style={styles.error}>{error}</div>;
    }
    if (schedule.length === 0) {
      return <div style={styles.placeholder}>左のパネルで条件を設定し、「ルートを作成」ボタンを押してください。</div>;
    }
    return (
      <>
        <div style={styles.card}>
          <h2 style={styles.header}>演説スケジュール案</h2>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>時間</th>
                <th style={styles.th}>アクション</th>
                <th style={styles.th}>場所・内容</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((item, index) => (
                <tr key={index}>
                  <td style={styles.td}>{item.startTime} - {item.endTime}</td>
                  <td style={styles.td}>{item.action}</td>
                  <td style={styles.td}>{item.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sources.length > 0 && (
          <div style={styles.card}>
            <h2 style={styles.header}>情報源</h2>
            <p style={{color: '#606770'}}>AIが場所の提案に使用した可能性のあるウェブサイトです。</p>
            <ul style={styles.sourceList}>
              {sources.map((source, index) => (
                <li key={index} style={styles.sourceItem}>
                  <a href={source.uri} target="_blank" rel="noopener noreferrer" style={styles.sourceLink}>{source.title || source.uri}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </>
    );
  }

  return (
    <div style={styles.appContainer}>
      <div style={styles.controlPanel}>
        <h1 style={styles.header}>演説ルートプランナー for 上田市</h1>
        <div style={styles.formGroup}>
          <label style={styles.label} id="district-label">訪問する地区（複数選択可）</label>
          <div style={{ marginBottom: '10px' }}>
            <label style={{...styles.checkboxLabel, paddingLeft: 0}}>
              <input
                type="checkbox"
                onChange={handleSelectAllChange}
                checked={selectedDistricts.length === allDistricts.length && allDistricts.length > 0}
                style={styles.checkbox}
              />
              すべて選択 / 解除
            </label>
          </div>
          <div style={styles.checkboxContainer} role="group" aria-labelledby="district-label">
            {Object.entries(UEDA_DISTRICTS_GROUPED).map(([area, districts], index) => (
                <fieldset key={area} style={{...styles.districtGroup, marginTop: index === 0 ? 0 : '10px'}}>
                    <legend style={styles.districtGroupHeader}>{area}</legend>
                    {districts.map(d => (
                        <label key={d} style={styles.checkboxLabel}>
                            <input type="checkbox" checked={selectedDistricts.includes(d)} onChange={() => handleDistrictChange(d)} style={styles.checkbox} />
                            {d}
                        </label>
                    ))}
                </fieldset>
            ))}
          </div>
        </div>
        <div style={styles.formGroup}>
          <label htmlFor="total-speeches" style={styles.label}>トータルの演説回数</label>
          <input id="total-speeches" type="number" value={totalSpeeches} onChange={e => setTotalSpeeches(e.target.value)} style={styles.input} />
        </div>
        <div style={styles.formGroup}>
          <label htmlFor="start-time" style={styles.label}>開始時間</label>
          <input id="start-time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={styles.input} />
        </div>
        <div style={styles.formGroup}>
          <label htmlFor="end-time" style={styles.label}>終了時間</label>
          <input id="end-time" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={styles.input} />
        </div>
        <button onClick={generateRoute} disabled={loading} style={{...styles.button, ...(loading && styles.buttonDisabled)}}>
          {loading ? '作成中...' : 'ルートを作成'}
        </button>
      </div>
      <div style={styles.resultsPanel}>
        {renderResults()}
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<React.StrictMode><App /></React.StrictMode>);