'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div style={{backgroundColor:'#0a1628', minHeight:'100vh', color:'white', fontFamily:'sans-serif'}}>
      <nav style={{display:'flex', justifyContent:'space-between', padding:'20px 40px', borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
        <span style={{fontSize:'24px', fontWeight:'bold'}}>ScopeProp</span>
        <Link href="/create" style={{backgroundColor:'white', color:'#0a1628', padding:'10px 20px', borderRadius:'8px', border:'none', cursor:'pointer', fontWeight:'bold', textDecoration:'none', display:'inline-block'}}>Get Started</Link>
      </nav>
      <div style={{textAlign:'center', padding:'100px 20px'}}>
        <h1 style={{fontSize:'48px', fontWeight:'bold', marginBottom:'20px'}}>Write Winning Proposals in 3 Minutes</h1>
        <p style={{fontSize:'20px', color:'rgba(255,255,255,0.7)', marginBottom:'40px'}}>AI that learns your pricing, style, and clients</p>
        {!submitted ? (
          <div style={{display:'flex', gap:'10px', justifyContent:'center'}}>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter your email" style={{padding:'15px', borderRadius:'8px', border:'none', width:'300px', fontSize:'16px'}}/>
            <button onClick={()=>setSubmitted(true)} style={{backgroundColor:'#3b82f6', color:'white', padding:'15px 30px', borderRadius:'8px', border:'none', cursor:'pointer', fontWeight:'bold', fontSize:'16px'}}>Get Early Access</button>
          </div>
        ) : (
          <p style={{fontSize:'20px', color:'#3b82f6'}}>🎉 You're on the list!</p>
        )}
      </div>
    </div>
  );
}
