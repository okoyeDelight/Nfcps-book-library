import type {CSSProperties} from 'react';
export default function FlipBookMark({size=18,className=''}:{size?:number;className?:string}){return <span className={`flip-book-mark ${className}`} style={{'--fb-size':`${size}px`} as CSSProperties} aria-hidden='true'><i className='fb-left'/><i className='fb-right'/><i className='fb-turn'/><i className='fb-spine'/></span>}
