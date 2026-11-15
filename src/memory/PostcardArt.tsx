import type { ReactNode } from 'react';
import { MEMORY_STAGES } from './stages';

// Original landscape drawings. These never read cards, seeds or picture names.
const tree = (x: number, y: number, scale = 1) => <g transform={`translate(${x} ${y}) scale(${scale})`}><path d="M-3 0H3V-35H-3Z" fill="#97724e"/><path d="M-19-22Q-31-44-12-51Q-10-72 9-60Q31-63 25-43Q37-24 15-20Z" fill="#5b8966"/></g>;
const scenes: Record<string, ReactNode> = {
  'mist-station': <><path d="M0 95L71 56H88L160 95" fill="#d8c9ab"/><rect x="45" y="33" width="72" height="39" rx="4" fill="#efe4c9"/><path d="M37 37Q81-7 125 37Z" fill="#54878a"/><path d="M77 72V48H92V72M52 48H66V59M102 48H111V59" fill="#a4c7ca"/><path d="M0 47H45M113 52H160M2 66H41" stroke="#f5f3df" strokeWidth="8"/></>,
  'forest-gate': <>{tree(20, 92, 1.25)}{tree(143, 92, 1.4)}<path d="M45 86V50Q80 4 115 50V86" fill="none" stroke="#b9a67d" strokeWidth="9"/><path d="M54 100L75 51H86L108 100" fill="#ddc99e"/></>,
  'sun-clearing': <><path d="M66 0H100L145 96H37Z" fill="#fff0b3"/><ellipse cx="82" cy="76" rx="60" ry="21" fill="#e5d69b"/>{tree(14, 86, .7)}{tree(149, 85, .7)}<path d="M38 79H119" stroke="#f7e9b9" strokeWidth="5"/></>,
  'tree-house': <>{tree(88, 95, 1.5)}<rect x="61" y="26" width="55" height="32" fill="#dcb17c"/><path d="M54 27L88 6L122 27Z" fill="#a66e53"/><rect x="77" y="34" width="16" height="17" fill="#a1c9c5"/><path d="M58 96L77 57M69 96L88 57M62 87H74M66 77H79M71 67H84" fill="none" stroke="#a67e54" strokeWidth="4"/></>,
  waterfall: <><path d="M17 47L32 19H112L142 91H14Z" fill="#8eaaa1"/><path d="M64 20H91V50H112V94H53V62H64Z" fill="#87cbd4"/><path d="M72 22V55H100V86M82 21V43" fill="none" stroke="#eef8ed" strokeWidth="5"/><ellipse cx="85" cy="91" rx="59" ry="9" fill="#acdce0"/></>,
  picnic: <>{tree(33, 89, 1.15)}<path d="M48 65H127L146 93H34Z" fill="#e5a17c"/><path d="M48 76H134M68 65L60 93M96 65L104 93M121 65L137 93" stroke="#fff1ce" strokeWidth="3"/><path d="M91 56H144M96 46H141M97 55V67M139 55V67" fill="none" stroke="#866b50" strokeWidth="6"/></>,
  'river-bridge': <><path d="M94 43C24 53 116 70 53 100" fill="none" stroke="#84c3ce" strokeWidth="29"/><path d="M36 75Q78 23 124 75" fill="none" stroke="#c6ab7d" strokeWidth="13"/><path d="M35 61Q78 10 125 61M42 56V68M61 42V52M82 37V47M104 44V55M119 55V67" fill="none" stroke="#8a7960" strokeWidth="3"/></>,
  'rainbow-hill': <><path d="M22 64A59 59 0 0 1 140 64" fill="none" stroke="#db957e" strokeWidth="9"/><path d="M31 64A50 50 0 0 1 131 64" fill="none" stroke="#efd895" strokeWidth="8"/><path d="M39 64A42 42 0 0 1 123 64" fill="none" stroke="#94b7b3" strokeWidth="8"/><path d="M0 86Q66 39 160 87V100H0Z" fill="#94b882"/><ellipse cx="93" cy="88" rx="28" ry="7" fill="#a8d3d7"/></>,
  'sunset-yard': <><rect width="160" height="64" fill="#e6b49c"/><circle cx="85" cy="52" r="28" fill="#f8da99"/><path d="M0 66H160V100H0Z" fill="#a4a581"/><path d="M10 89V67H151V89M12 78H151M36 67V89M62 67V89M89 67V89M116 67V89M140 67V89" fill="none" stroke="#cfb792" strokeWidth="6"/></>,
  'sea-gate': <><path d="M0 50H160V100H0Z" fill="#8ec6ce"/><path d="M0 69Q36 41 60 87L97 100H0M160 60Q127 53 108 91L91 100H160" fill="#dacc9e"/>{tree(17, 100, 1.5)}{tree(147, 100, 1.6)}<path d="M56 59H113M73 73H133" stroke="#dfede3" strokeWidth="3"/></>,
  shore: <><path d="M0 48Q38 35 61 61L126 65Q80 91 0 90" fill="#92c9d0"/><path d="M0 50Q37 40 62 64" fill="none" stroke="#f9edc5" strokeWidth="7"/><path d="M24 58V24L47 31L24 38" fill="#cf8c64" stroke="#866951" strokeWidth="2"/></>,
  cape: <><path d="M13 58L38 35L70 51L108 37L136 65Z" fill="#8b9c9c"/><path d="M56 52L64 15H85L94 52Z" fill="#f7e7c2"/><path d="M61 31H89L87 40H59Z" fill="#c87865"/><rect x="64" y="10" width="21" height="10" fill="#f7d88e"/><path d="M58 11L75 2L92 11Z" fill="#587b86"/></>,
  launch: <><path d="M20 63H133M34 63V13H52V63M34 24H52M34 42H52" fill="none" stroke="#91a8ab" strokeWidth="5"/><path d="M77 56Q65 27 84 10Q105 27 93 56Z" fill="#f5e9d4"/><path d="M77 56L70 65L71 43M94 56L101 65L99 43" fill="#cc8c7b"/><circle cx="85" cy="32" r="6" fill="#8ab7c9"/><path d="M77 58L84 76L93 58" fill="#f6d48c"/></>,
  observatory: <><rect x="29" y="37" width="103" height="26" fill="#e1d8c2"/><path d="M29 38A51 33 0 0 1 132 38Z" fill="#799ba9"/><path d="M77 7Q94 16 91 38" fill="none" stroke="#e3ebd9" strokeWidth="9"/><path d="M81 23L108 6L115 16L87 34Z" fill="#e7bc7e"/><rect x="73" y="46" width="16" height="17" fill="#7b979d"/></>,
  'sky-bridge': <><path d="M0 53Q20 34 45 52L47 63H0M114 58Q132 37 160 48V64H114" fill="#f7f7e9"/><path d="M31 53Q79 77 130 53M31 39Q79 63 130 39M44 44V58M63 49V64M83 51V67M105 47V62M123 41V56" fill="none" stroke="#b69573" strokeWidth="4"/></>,
  'ring-harbor': <><ellipse cx="80" cy="26" rx="56" ry="14" fill="none" stroke="#cfb584" strokeWidth="10" transform="rotate(-15 80 26)"/><path d="M44 37Q76 18 114 39" fill="none" stroke="#8ba8b6" strokeWidth="9"/><ellipse cx="82" cy="59" rx="47" ry="14" fill="#91c6d0"/><path d="M37 60Q81 85 128 60M48 64V75M111 65V76" fill="none" stroke="#aa8b67" strokeWidth="7"/></>,
  garden: <><path d="M20 59Q30 30 73 45Q120 25 142 60Z" fill="#87af7a"/><path d="M0 62Q15 48 30 61Q48 74 68 62M111 64Q135 52 160 64" fill="#f3f6e8"/>{tree(38, 57, .55)}<path d="M90 57V37H123V57M85 38L106 24L129 38Z" fill="#d1af84"/><path d="M63 54V44M72 56V39M62 44H65M69 40H75" stroke="#e7bc86" strokeWidth="5"/></>,
  'lake-valley': <><path d="M0 45L28 12L61 58M100 59L135 15L160 51" fill="#7faaa6"/><ellipse cx="80" cy="58" rx="49" ry="17" fill="#88c6d9"/><path d="M74 0Q117 15 74 31Q43 40 77 48" fill="none" stroke="#88c6d9" strokeWidth="12"/><path d="M55 57H92M75 65H108" stroke="#edf5df" strokeWidth="3"/></>,
  'star-field': <><path d="M0 51Q65 24 160 56V70H0Z" fill="#a7b5a3"/><path d="M0 24Q80 66 160 13" fill="none" stroke="#f3e4ae" strokeWidth="13"/>{[20,49,78,109,143].map((x,i)=><path key={x} d={`M${x} ${14+i%3*6}l3 6 6 2-6 2-3 6-3-6-6-2 6-2Z`} fill="#fff4ce"/>)}</>,
  arrival: <><path d="M62 62V39H122V62M55 40H129M68 47H117M72 40V62M110 40V62" fill="none" stroke="#8a846c" strokeWidth="4"/><path d="M78 36V25H103V36M75 25L91 15L107 25" fill="none" stroke="#8d7b61" strokeWidth="3"/><path d="M48 65L65 54M127 65L115 54" stroke="#c2b08c" strokeWidth="6"/></>,
};

/** Map pieces share one coordinate system for continuous land, sky and serpentine road. */
export function PostcardArt({ id }: { id: string }) {
  const stage = MEMORY_STAGES.find(s => s.id === id);
  if (!stage?.postcard) return null;
  const { asset, map } = stage.postcard;
  const x = (map?.col ?? 0) * 160, y = (map?.row ?? 0) * 100;
  return <svg viewBox="0 0 160 100" aria-hidden="true" focusable="false" className="memory-landscape">
    {map ? <>
      <g transform={`translate(${-x} ${-y})`}>
        <rect width="320" height="500" fill="#dcebed"/>
        {[0,100,200,300,400].map(top => <path key={top} d={`M15 ${top+68}Q30 ${top+43} 90 ${top+53}Q160 ${top+42} 225 ${top+53}Q289 ${top+43} 306 ${top+68}Q293 ${top+94} 235 ${top+94}H84Q25 ${top+94} 15 ${top+68}Z`} fill="#b7c6a1"/>)}
        <path d="M45 70H250Q265 70 265 85V155Q265 170 250 170H70Q55 170 55 185V255Q55 270 70 270H250Q265 270 265 285V355Q265 370 250 370H70Q55 370 55 385V455Q55 470 70 470H284Q306 470 306 482" fill="none" stroke="#a69272" strokeWidth="13" strokeLinecap="round"/>
        <path d="M45 70H250Q265 70 265 85V155Q265 170 250 170H70Q55 170 55 185V255Q55 270 70 270H250Q265 270 265 285V355Q265 370 250 370H70Q55 370 55 385V455Q55 470 70 470H284Q306 470 306 482" fill="none" stroke="#eee0b8" strokeWidth="9" strokeLinecap="round"/>
      </g>
      <g transform="translate(12 2) scale(.85)">{scenes[asset]}</g>
      {asset === 'arrival' && <><path d="M136 79V53L155 58L136 64" fill="#dc9b70" stroke="#8d7b61" strokeWidth="2"/><circle cx="146" cy="82" r="8" fill="#58877f"/><path d="M142 82l3 3 5-6" fill="none" stroke="#fff5d6" strokeWidth="2"/></>}
    </> : <><rect width="160" height="100" fill="#dcebed"/><path d="M0 59Q66 39 160 60V100H0Z" fill="#b5c8a1"/>{scenes[asset]}</>}
  </svg>;
}
