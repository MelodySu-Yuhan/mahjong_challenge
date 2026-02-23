
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Sparkles, 
  RotateCcw, 
  Info,
  Copy,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// --- 内置挑战库 (Fallback Bank) ---
const FALLBACK_TRIGGERS = ["有人说了数字(1-9)", "有人说了颜色(红/白/青等)", "有人说了‘筒’", "有人说了‘条’", "有人说了‘万’", "有人说了‘快点/该你了’", "有人说了‘碰/杠/胡’", "有人喝水/吃零食", "有人看弃牌堆", "有人叹气", "有人起身/伸懒腰", "有人摸头发/挠头", "有人看手机", "有人说‘天呐/哎呀’", "有人整理自己的牌"];
const FALLBACK_ACTIONS = ["立刻捏住鼻子说：‘我是小猪’", "立刻起立转一圈再坐下", "立刻拍一下自己的屁股", "立刻大喊：‘家人们我先干了！’", "立刻摸一下自己的耳垂", "立刻对着空气飞吻一下", "立刻学一声猫叫(喵~)", "立刻双手托腮摆个Pose(2秒)", "立刻对着天花板大笑三声", "立刻双手握拳放在脸颊边卖萌", "立刻举起右手敬个礼", "立刻深呼吸并大喊：‘好牌！’", "立刻像猴子一样抓一下头皮", "立刻闭眼5秒钟并念咒：‘看不见我’", "立刻起立鞠个躬说：‘老板大气’"];

// --- Constants ---
const REFERENCE_TRIGGERS = "数字, 颜色, 筒, 条, 万, 快点, 碰/杠, 喝水, 叹气, 看手机, 整理牌";
const REFERENCE_ACTIONS = "学猪叫, 转圈, 拍屁股, 飞吻, 猫叫, 托腮, 大笑, 敬礼, 抓头, 念咒, 鞠躬";

interface Challenge {
  category: string;
  trigger: string;
  action: string;
  content: string;
  isAiGenerated: boolean;
}

const CATEGORIES = [
  { name: '语言类', color: '#ef4444', desc: '有人说话触发' },
  { name: '动作类', color: '#3b82f6', desc: '有人肢体动作触发' },
  { name: '麻将类', color: '#10b981', desc: '牌局进展触发' },
  { name: '环境类', color: '#f59e0b', desc: '场外细节触发' },
  { name: '随机类', color: '#8b5cf6', desc: '万物皆可挑战' },
  { name: '特别类', color: '#ec4899', desc: '高难度大动作' }
];

const App: React.FC = () => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[0] | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const wheelRef = useRef<HTMLDivElement>(null);

  // 本地随机生成逻辑
  const generateLocalChallenge = (categoryName: string): Challenge => {
    const t = FALLBACK_TRIGGERS[Math.floor(Math.random() * FALLBACK_TRIGGERS.length)];
    const a = FALLBACK_ACTIONS[Math.floor(Math.random() * FALLBACK_ACTIONS.length)];
    return {
      category: categoryName,
      trigger: t,
      action: a,
      content: `只要场上【${t}】，你就要【${a}】！`,
      isAiGenerated: false
    };
  };

  const generateThemedChallenge = async (categoryName: string) => {
    setIsLoading(true);
    // 每次生成前先清空旧内容，防止视觉卡顿
    setChallenge(null);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const timestamp = Date.now();
    const randomSalt = Math.random().toString(36).substring(7);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `[SessionID: ${timestamp}-${randomSalt}] 
        你是一个幽默的聚会游戏专家。请为麻将挑战设计一个完全独特的规则。
        类别：${categoryName}
        参考关键词：${REFERENCE_TRIGGERS} / ${REFERENCE_ACTIONS}
        输出要求：trigger和action必须新鲜有趣，不要重复。
        输出JSON：{"trigger": "...", "action": "..."}`,
        config: {
          temperature: 1.0,
          seed: Math.floor(Math.random() * 999999),
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              trigger: { type: Type.STRING },
              action: { type: Type.STRING }
            },
            required: ["trigger", "action"]
          }
        }
      });
      
      const data = JSON.parse(response.text || '{}');
      setChallenge({
        category: categoryName,
        trigger: data.trigger,
        action: data.action,
        content: `只要场上【${data.trigger}】，你就要【${data.action}】！`,
        isAiGenerated: true
      });
    } catch (e) {
      console.warn("AI 联机失败，已切换至本地内置挑战库", e);
      // 如果 AI 报错，立刻使用本地库，保证用户体验
      setChallenge(generateLocalChallenge(categoryName));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpin = () => {
    if (isSpinning || challenge) return;

    // 重置状态
    setIsRevealed(false);
    setIsSpinning(true);

    const extraSpins = 5 + Math.random() * 5; 
    const randomSector = Math.floor(Math.random() * CATEGORIES.length);
    const sectorAngle = 360 / CATEGORIES.length;
    const newRotation = rotation + (extraSpins * 360) + (randomSector * sectorAngle);
    
    setRotation(newRotation);

    setTimeout(() => {
      setIsSpinning(false);
      const normalizedRotation = newRotation % 360;
      const landedIdx = (CATEGORIES.length - Math.floor(normalizedRotation / sectorAngle)) % CATEGORIES.length;
      const category = CATEGORIES[landedIdx];
      setSelectedCategory(category);
      generateThemedChallenge(category.name);
    }, 4000);
  };

  const copyToClipboard = () => {
    if (challenge) {
      navigator.clipboard.writeText(challenge.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const reset = () => {
    setChallenge(null);
    setSelectedCategory(null);
    setIsRevealed(false);
    setRotation(0);
    setCopied(false);
  };

  return (
    <div className="min-h-screen bg-[#064e3b] text-white flex flex-col items-center p-4 overflow-hidden selection:bg-emerald-500">
      <div className="fixed inset-0 opacity-5 pointer-events-none" 
           style={{backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>

      <header className="relative z-10 text-center mt-6 mb-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-500 flex items-center justify-center gap-3 drop-shadow-sm">
          <Sparkles className="text-yellow-400 w-8 h-8 md:w-10 md:h-10" />
          麻将挑战轮盘
        </h1>
        <p className="text-emerald-200 mt-2 font-medium tracking-[0.2em] opacity-80 text-xs md:text-sm uppercase">Secret Mahjong Missions</p>
      </header>

      <main className="relative z-10 w-full max-w-md flex flex-col items-center flex-grow">
        
        {(!challenge && !isLoading) ? (
          <div className="flex flex-col items-center space-y-12 py-4 animate-in fade-in duration-500">
            <div className="relative group">
              <div className="absolute inset-0 bg-yellow-500/20 blur-[60px] rounded-full scale-110"></div>
              
              <div className="absolute top-[-22px] left-1/2 -translate-x-1/2 z-30">
                <div className="w-10 h-12 bg-white rounded-b-2xl shadow-xl border-2 border-slate-200 flex items-center justify-center">
                   <div className="w-2 h-7 bg-red-600 rounded-full shadow-inner animate-pulse"></div>
                </div>
              </div>

              <div 
                ref={wheelRef}
                className="w-72 h-72 md:w-80 md:h-80 rounded-full border-[10px] border-yellow-600/40 shadow-[0_0_80px_rgba(0,0,0,0.6)] overflow-hidden transition-transform duration-[4000ms] ease-[cubic-bezier(0.15,0,0.1,1)] relative bg-slate-800"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                {CATEGORIES.map((cat, i) => {
                  const angle = 360 / CATEGORIES.length;
                  const tanVal = Math.tan((angle / 2) * Math.PI / 180);
                  const p1 = 50 - (50 * tanVal);
                  const p2 = 50 + (50 * tanVal);
                  
                  return (
                    <div key={cat.name} className="absolute top-0 left-0 w-full h-full origin-center"
                      style={{ transform: `rotate(${i * angle}deg)`, clipPath: `polygon(50% 50%, ${p1}% 0%, ${p2}% 0%)` }}>
                      <div className="w-full h-full flex items-start justify-center pt-10" style={{ backgroundColor: cat.color }}>
                        <span className="text-white font-black text-sm md:text-base [writing-mode:vertical-rl] tracking-[0.3em] drop-shadow-md select-none">
                          {cat.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div className="absolute inset-0 m-auto w-20 h-20 bg-white/10 backdrop-blur-xl rounded-full border-4 border-white/30 flex items-center justify-center z-10 shadow-2xl">
                   <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center font-black text-emerald-900 text-2xl shadow-inner border border-slate-100">
                      中
                   </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className={`group relative px-14 py-5 rounded-full font-black text-2xl transition-all shadow-[0_8px_0_rgb(180,83,9)] active:translate-y-1 active:shadow-none ${
                isSpinning ? 'bg-slate-500 cursor-not-allowed opacity-50' : 'bg-gradient-to-b from-yellow-300 to-yellow-500 text-amber-950 hover:brightness-110 active:scale-95'
              }`}
            >
              {isSpinning ? '正在旋转...' : '启动轮盘'}
              {!isSpinning && <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full animate-ping"></div>}
            </button>
          </div>
        ) : (
          <div className="w-full space-y-6 animate-in zoom-in-95 fade-in duration-500 px-2">
            <div className="text-center space-y-2">
               <span className="px-5 py-1.5 bg-yellow-500 text-emerald-950 rounded-full font-black text-xs uppercase tracking-widest shadow-lg">
                 {selectedCategory?.name}
               </span>
               <h3 className="text-2xl font-bold text-white/90">
                 {isLoading ? '秘密生成中...' : '抽取成功，点击翻牌'}
               </h3>
            </div>

            <div className="relative group perspective-1000">
              <div 
                className={`w-full bg-slate-100 rounded-[2.5rem] p-1 shadow-2xl transition-all duration-700 transform-style-3d cursor-pointer active:scale-[0.98] ${isRevealed ? 'rotate-y-180' : ''}`}
                onClick={() => !isLoading && setIsRevealed(!isRevealed)}
                style={{ transform: isRevealed ? 'rotateY(180deg)' : 'none', transformStyle: 'preserve-3d' }}
              >
                {/* Back (Secret State) */}
                <div className="backface-hidden w-full aspect-[4/5] bg-emerald-800 rounded-[2.3rem] flex flex-col items-center justify-center p-8 border-[6px] border-emerald-600/50 shadow-inner">
                   {isLoading ? (
                     <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-20 border-8 border-white/20 border-t-yellow-400 rounded-full animate-spin"></div>
                        <p className="text-white/60 font-bold tracking-widest animate-pulse">正在编织秘密...</p>
                     </div>
                   ) : (
                     <div className="w-32 h-44 bg-slate-50 rounded-2xl shadow-2xl flex flex-col items-center justify-center border-b-[10px] border-slate-300 group-hover:scale-105 transition-transform">
                        <div className="text-7xl font-black text-emerald-700 drop-shadow-sm">發</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-3 tracking-widest">点击查看</div>
                     </div>
                   )}
                   {!isLoading && <p className="mt-8 text-white/30 font-bold tracking-[0.3em] text-[10px] uppercase">TOP SECRET MISSION</p>}
                </div>

                {/* Front (Reveal State) */}
                <div className="absolute inset-0 backface-hidden w-full h-full bg-white rounded-[2.3rem] flex flex-col items-center justify-center p-8 border-[6px] border-yellow-500/50 rotate-y-180 overflow-hidden"
                  style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
                  
                  {challenge && (
                    <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom duration-700">
                       <div className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-xs border border-emerald-100 shadow-sm flex items-center gap-2">
                          {challenge.isAiGenerated ? <Sparkles className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {selectedCategory?.desc} {challenge.isAiGenerated ? '(AI生成)' : '(内置库)'}
                       </div>
                       <p className="text-slate-800 text-2xl md:text-3xl font-black leading-snug px-2">
                          {challenge.content}
                       </p>
                       <div className="pt-8 border-t border-slate-100 w-full flex flex-col items-center gap-3">
                         <button onClick={(e) => { e.stopPropagation(); copyToClipboard(); }}
                            className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition-colors text-sm font-medium">
                           {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                           {copied ? '已复制' : '复制保存'}
                         </button>
                         <p className="text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                           ⚠️ 请务必保密，被发现则挑战失败
                         </p>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={reset}
              disabled={isLoading}
              className="w-full py-5 bg-emerald-900/40 hover:bg-emerald-900 text-emerald-100 font-bold rounded-2xl border border-emerald-700/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <RotateCcw className="w-5 h-5" /> 返回转盘
            </button>
          </div>
        )}

      </main>

      <footer className="mt-auto pt-8 pb-6 text-center text-emerald-400/40 text-[10px] max-w-xs leading-relaxed tracking-wider">
        <div className="flex items-center justify-center gap-1.5 mb-2">
           <Info className="w-3.5 h-3.5" />
           <p className="font-medium">规则：只要触发条件达成，你就必须做指定动作。</p>
        </div>
        <p className="opacity-60">MAHJONG CHALLENGE MASTER v1.1 • DUAL-ENGINE DRIVEN</p>
      </footer>

      <style>{`
        .rotate-y-180 { transform: rotateY(180deg); }
        .backface-hidden { backface-visibility: hidden; }
        .transform-style-3d { transform-style: preserve-3d; }
        .perspective-1000 { perspective: 1000px; }
      `}</style>
    </div>
  );
};

export default App;
