import { useState, useEffect } from 'react';
import { Lock, Unlock, ShieldCheck, KeyRound, Delete, Truck } from 'lucide-react';
import { hashPin } from '../utils/storage';

export default function PinLock({ storedPinHash, fleetPinHash, onUnlock, onSetPin }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(!storedPinHash);
  const [step, setStep] = useState('enter'); // 'enter' | 'create' | 'confirm'
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);

  // If no PIN has been set yet, go to setup mode
  useEffect(() => {
    if (!storedPinHash) {
      setIsSettingUp(true);
      setStep('create');
    } else {
      setIsSettingUp(false);
      setStep('enter');
    }
  }, [storedPinHash]);

  // Support physical keyboard number typing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, step, isSettingUp]);

  const triggerError = (msg) => {
    setError(msg);
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
    setPin('');
  };

  const handleDigit = async (digit) => {
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setError('');

    if (nextPin.length === 4) {
      if (isSettingUp) {
        if (step === 'create') {
          setConfirmPin(nextPin);
          setPin('');
          setStep('confirm');
        } else if (step === 'confirm') {
          if (nextPin === confirmPin) {
            const hash = await hashPin(nextPin);
            onSetPin(hash);
            onUnlock('owner');
          } else {
            triggerError('PINs do not match. Try again.');
            setStep('create');
            setConfirmPin('');
          }
        }
      } else {
        // Verifying entered PIN against Master or Fleet PIN
        const enteredHash = await hashPin(nextPin);
        if (enteredHash === storedPinHash) {
          onUnlock('owner');
        } else if (fleetPinHash && enteredHash === fleetPinHash) {
          onUnlock('fleet_only');
        } else {
          triggerError('Incorrect PIN. Try again.');
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, #1e1e2e 0%, #0f0f17 100%)',
      color: '#fff',
      padding: 20
    }}>
      <div style={{
        maxWidth: 380,
        width: '100%',
        background: 'rgba(26, 27, 46, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 24,
        padding: '36px 28px',
        textAlign: 'center',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        animation: shaking ? 'shake 0.4s ease' : 'none'
      }}>
        {/* Icon */}
        <div style={{
          width: 68,
          height: 68,
          borderRadius: 20,
          background: isSettingUp ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)'
        }}>
          {isSettingUp ? <KeyRound size={32} color="#fff" /> : <Lock size={30} color="#fff" />}
        </div>

        {/* Title */}
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          {isSettingUp
            ? (step === 'create' ? 'Create Security PIN' : 'Confirm Security PIN')
            : 'AssetFlow Protected'}
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 24px' }}>
          {isSettingUp
            ? (step === 'create' ? 'Set a 4-digit PIN to secure your financial data' : 'Re-enter your 4-digit PIN to confirm')
            : (fleetPinHash ? 'Enter Master PIN or Fleet PIN' : 'Enter your 4-digit PIN to access your assets')}
        </p>

        {/* PIN Dots Display */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 28 }}>
          {[0, 1, 2, 3].map(i => {
            const filled = i < pin.length;
            return (
              <div
                key={i}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: filled ? '#6366f1' : 'rgba(255, 255, 255, 0.15)',
                  border: filled ? '2px solid #818cf8' : '2px solid transparent',
                  transform: filled ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                  boxShadow: filled ? '0 0 12px rgba(99, 102, 241, 0.8)' : 'none'
                }}
              />
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            color: '#f87171',
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 16,
            background: 'rgba(239, 68, 68, 0.12)',
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid rgba(239, 68, 68, 0.25)'
          }}>
            {error}
          </div>
        )}

        {/* Interactive Numpad */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          maxWidth: 280,
          margin: '0 auto'
        }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(String(num))}
              style={{
                height: 56,
                borderRadius: 16,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#fff',
                fontSize: 20,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.1s ease',
                userSelect: 'none'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {num}
            </button>
          ))}

          {/* Empty placeholder */}
          <div />

          {/* 0 button */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            style={{
              height: 56,
              borderRadius: 16,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#fff',
              fontSize: 20,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.1s ease',
              userSelect: 'none'
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            0
          </button>

          {/* Backspace button */}
          <button
            type="button"
            onClick={handleBackspace}
            style={{
              height: 56,
              borderRadius: 16,
              border: 'none',
              background: 'transparent',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none'
            }}
            title="Delete"
          >
            <Delete size={22} />
          </button>
        </div>

        <div style={{ marginTop: 24, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          🔒 End-to-end encrypted · Session protected
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
