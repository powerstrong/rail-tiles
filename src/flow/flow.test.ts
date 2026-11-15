import { describe, expect, it } from 'vitest';
import { starsFor } from '../engine/stars';
import { continueTarget } from '../continue';
import { emptyProgress, loadProgress, recordClear, saveProgress } from '../storage';
import { isUnlocked } from '../ui/StageSelect';
import { stageCards, worldById } from '../worlds';
import { FLOW_STAGES } from './stages';
import { adjacent, beginThread, buttonAt, connected, emptyThreads, endpointAt, extendThread, feedback, initialPlay, isComplete, reducePlay, threadLength, type FlowStage, type Threads } from './model';
import { auditStage, candidatesFor, deduce } from './solver';

const draw = (s: FlowStage, paths: Threads, route: number[]) => {
  const start = beginThread(s, paths, route[0])!;
  return route.slice(1).reduce((p,c) => extendThread(s,p,start.color,c),start.paths);
};
const fixture: FlowStage = { id:'test', number:1, title:'test', label:'', cols:4, rows:4, cells:Array.from({length:16},(_,i)=>i), fill:false, pairs:[{ends:[0,15],via:[]},{ends:[4,7],via:[]}], solution:[], par:0 };
function valid(s: FlowStage, paths: Threads) {
  const fail = () => { throw new Error(`Invalid flow editing state: ${s.id} ${JSON.stringify(paths)}`); };
  if (new Set(paths.flat()).size !== paths.flat().length) fail();
  paths.forEach((p,i) => {
    if (!p.length) return;
    if (!s.pairs[i].ends.includes(p[0])) fail();
    p.forEach((c,k) => {
      if (!s.cells.includes(c) || ![i,-1].includes(endpointAt(s,c)) || ![i,-1].includes(buttonAt(s,c))) fail();
      if (k && !adjacent(s,p[k-1],c)) fail();
      if (k > 0 && k < p.length-1 && endpointAt(s,c) !== -1) fail();
    });
  });
}
describe('flow editing is always reversible', () => {
  it('cuts the other thread immediately, keeps just one owner, and undoes an entire gesture including its cut', () => {
    const s=fixture;
    let g=initialPlay(s);
    for (const c of [4,5,6,7]) g=reducePlay(s,g,{type:c===4?'begin':'extend',cell:c});
    g=reducePlay(s,g,{type:'end'});
    const before=g.paths;
    for (const c of [0,1,5,9]) g=reducePlay(s,g,{type:c===0?'begin':'extend',cell:c});
    expect(g.paths).toEqual([[0,1,5,9],[4]]);
    expect(g.note).toContain('끊겼어요');
    valid(s,g.paths);
    g=reducePlay(s,g,{type:'end'});
    expect(reducePlay(s,g,{type:'undo'}).paths).toEqual(before);
  });
  it('redraws from an interior cell, retraces, refuses diagonal jumps and other endpoints', () => {
    const s=fixture, paths=draw(s,emptyThreads(s),[4,5,6,7]);
    const started=beginThread(s,paths,5)!;
    expect(started.paths[1]).toEqual([4,5]);
    const extended=extendThread(s,started.paths,1,9);
    expect(extended[1]).toEqual([4,5,9]);
    expect(extendThread(s,extended,1,5)[1]).toEqual([4,5]);
    expect(extendThread(s,extended,1,14)).toBe(extended);
    expect(extendThread(s,extended,1,15)).toBe(extended);
  });
  it('cancels an unfinished pointer stroke without retaining the cuts, or a phantom undo step', () => {
    const s=fixture;
    let g=initialPlay(s);
    g=reducePlay(s,g,{type:'begin',cell:4});
    g=reducePlay(s,g,{type:'extend',cell:5});
    g=reducePlay(s,g,{type:'cancel'});
    expect(g.paths).toEqual(emptyThreads(s)); expect(g.history).toHaveLength(0);
  });
  it('allows tap and keyboard continuation, including the matching goal endpoint', () => {
    const s=FLOW_STAGES[0]; let g=initialPlay(s);
    for (const cell of s.solution[0]) { g=reducePlay(s,g,{type:'begin',cell}); g=reducePlay(s,g,{type:'end'}); }
    expect(isComplete(s,g.paths)).toBe(true);
    expect(feedback(s,g.paths).remaining).toBe(1);
    expect(isComplete({...s,fill:true},g.paths)).toBe(false);
  });
  it('requires a matching ring, and reserves it against the other threads', () => {
    const s=FLOW_STAGES[29], color=s.pairs.findIndex(p=>p.via.length>0);
    const wrong=[...s.solution[color].filter(c=>!s.pairs[color].via.includes(c))];
    expect(connected(s,s.solution.map((p,i)=>i===color?wrong:p),color)).toBe(false);
    const ring=s.pairs[color].via[0], other=(color+1)%s.pairs.length;
    const near=[ring-1,ring+1,ring-s.cols,ring+s.cols].find(c=>s.cells.includes(c)&&adjacent(s,c,ring))!;
    const paths=emptyThreads(s); paths[other]=[near];
    expect(extendThread(s,paths,other,ring)).toBe(paths);
  });
  it('replays fixed-seed arbitrary edits without sharing squares; hints converge and keep their star cap after undo', () => {
    let seed=8171;
    for (const s of FLOW_STAGES) {
      let g=initialPlay(s);
      for(let k=0;k<250;k++) {
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;
        const cell=seed%(s.cols*s.rows);
        g=reducePlay(s,g,{type:k%7===0?'begin':'extend',cell});
        if(k%7===6) g=reducePlay(s,g,{type:'end'});
        valid(s,g.paths);
      }
      for(let i=0;i<s.pairs.length;i++) g=reducePlay(s,g,{type:'hint'});
      expect(isComplete(s,g.paths),s.id).toBe(true);
      expect(starsFor(threadLength(g.paths),s.par,g.hinted)).toBe(2);
      g=reducePlay(s,g,{type:'undo'}); expect(g.hinted).toBe(true);
      expect(reducePlay(s,g,{type:'reset'}).hinted).toBe(false);
    }
  });
});

describe('30 official flow stages', () => {
  it('has three chapters, stable ids, one-gesture introduction, and a changed rule at each chapter', () => {
    expect(FLOW_STAGES).toHaveLength(30);
    expect(FLOW_STAGES.map(s=>s.id)).toEqual(Array.from({length:30},(_,i)=>`flow-${i+1}`));
    expect(FLOW_STAGES[0].solution).toEqual([[3,4,5]]);
    expect(FLOW_STAGES.slice(0,10).every(s=>!s.fill)).toBe(true);
    expect(FLOW_STAGES.slice(10).every(s=>s.fill)).toBe(true);
    expect(FLOW_STAGES.slice(20).every(s=>s.pairs.some(p=>p.via.length))).toBe(true);
  });
  for(const s of FLOW_STAGES) it(`${s.number}: solution replay in either direction/order, exact uniqueness, inference without branching`, () => {
    expect(new Set(s.pairs.flatMap(p=>p.ends)).size).toBe(s.pairs.length*2);
    for(const reverse of [false,true]) {
      let paths=emptyThreads(s);
      const routes=reverse?s.solution.map(p=>[...p].reverse()).reverse():s.solution;
      for(const p of routes) { paths=draw(s,paths,p); valid(s,paths); }
      expect(isComplete(s,paths)).toBe(true);
      expect(starsFor(threadLength(paths),s.par,false)).toBe(3);
    }
    const audit=auditStage(s);
    expect(audit.solutions).toBe(1); expect(audit.logicSolved).toBe(true);
    const logic=deduce(s,candidatesFor(s));
    expect(logic.domains.map(d=>d[0].path)).toEqual(s.solution);
    if(s.number>=21) expect(auditStage({...s,pairs:s.pairs.map(p=>({...p,via:[]}))}).solutions).toBe(2);
  });
  it('distinguishes zero/multiple solutions instead of declaring every supplied witness unique', () => {
    const s: FlowStage={...fixture,cols:2,rows:2,cells:[0,1,2,3],pairs:[{ends:[0,3],via:[]}],solution:[],fill:false};
    expect(auditStage(s).solutions).toBe(2);
    expect(auditStage({...s,cells:[0,3]}).solutions).toBe(0);
    // A single candidate can still leave an unfillable square; it isn't a deduction certificate.
    const dangling:FlowStage={...s,cols:3,rows:1,cells:[0,1,2],pairs:[{ends:[0,1],via:[]}],fill:true};
    expect(auditStage(dangling).solutions).toBe(0);
    expect(deduce(dangling,candidatesFor(dangling)).logicSolved).toBe(false);
  });
  it('cross-checks the verifier against a separate naive combination enumerator on small boards', () => {
    // No production adjacency, path enumeration, bitmask or pruning in this oracle.
    const count = (s: FlowStage) => {
      const candidates=s.pairs.map((pair,color)=>{
        const found:number[][]=[];
        const walk=(p:number[])=>{
          const head=p.at(-1)!;
          if(head===pair.ends[1]) {if(pair.via.every(c=>p.includes(c)))found.push(p);return;}
          for(const c of s.cells) {
            const distance=Math.abs(c%s.cols-head%s.cols)+Math.abs(Math.floor(c/s.cols)-Math.floor(head/s.cols));
            if(distance!==1||p.includes(c)||s.pairs.some((v,i)=>i!==color&&[...v.ends,...v.via].includes(c)))continue;
            walk([...p,c]);
          }
        };
        walk([pair.ends[0]]); return found;
      });
      let total=0;
      const combine=(i:number,used:number[])=>{
        if(i===candidates.length){if(!s.fill||used.length===s.cells.length)total++;return;}
        for(const p of candidates[i])if(!p.some(c=>used.includes(c)))combine(i+1,[...used,...p]);
      };
      combine(0,[]);return Math.min(2,total);
    };
    for(let a=1;a<9;a++)for(let b=1;b<9;b++)if(a!==b&&a!==4&&b!==4) {
      for(const fill of [false,true]) {
        const s:FlowStage={...fixture,cols:3,rows:3,cells:[0,1,2,3,4,5,6,7,8],fill,pairs:[{ends:[0,a],via:[]},{ends:[4,b],via:[]}],solution:[]};
        expect(auditStage(s).solutions).toBe(count(s));
      }
    }
  });
});

describe('flow official progress integration', () => {
  it('opens initially, unlocks sequentially, resumes, and merges stars without changing legacy records', () => {
    const w=worldById('flow')!; expect(w.unlockAfter).toBeUndefined();
    const cards=stageCards(w);
    expect(isUnlocked(cards,new Set(),0)).toBe(true); expect(isUnlocked(cards,new Set(),1)).toBe(false);
    let p=recordClear(emptyProgress(),'last-run',3); p=recordClear(p,'flow-1',2);
    expect(isUnlocked(cards,new Set(Object.keys(p.stars)),1)).toBe(true);
    p.last={world:'flow',stage:'flow-1'};
    expect(continueTarget(p)?.index).toBe(1);
    const store={value:'',getItem(){return this.value||null;},setItem(_k:string,v:string){this.value=v;}};
    saveProgress(p,store);
    saveProgress({...p,stars:{'flow-1':1}},store);
    expect(loadProgress(store).stars).toEqual({'last-run':3,'flow-1':2});
  });
});
