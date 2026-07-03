import React from 'react';
import { Check } from 'lucide-react';

interface OnboardingStepsProps {
  currentStep: 1 | 2 | 3;
}

export const OnboardingSteps: React.FC<OnboardingStepsProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, label: 'Hồ sơ' },
    { number: 2, label: 'Xét duyệt' },
    { number: 3, label: 'Bình chọn' }
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: '32px', position: 'relative', padding: '0 10px' }}>
      {/* Connector Line */}
      <div 
        style={{ 
          position: 'absolute', 
          top: '14px', 
          left: '12%', 
          right: '12%', 
          height: '2px', 
          backgroundColor: '#E5E5EA', 
          zIndex: 1 
        }} 
      >
        <div 
          style={{ 
            height: '100%', 
            width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%', 
            backgroundColor: '#1D1D1F', 
            transition: 'width 0.4s ease' 
          }} 
        />
      </div>

      {/* Step Nodes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', zIndex: 2 }}>
        {steps.map(step => {
          const isCompleted = currentStep > step.number;
          const isActive = currentStep === step.number;
          
          return (
            <div key={step.number} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              {/* Node Circle */}
              <div 
                style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  backgroundColor: isCompleted ? '#1D1D1F' : isActive ? '#1D1D1F' : '#FFFFFF', 
                  border: isCompleted || isActive ? '2px solid #1D1D1F' : '2px solid #D1D1D6', 
                  color: isCompleted || isActive ? '#FFFFFF' : '#8E8E93', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '12px', 
                  fontWeight: 700, 
                  transition: 'all 0.3s ease',
                  boxShadow: isActive ? '0 0 0 4px rgba(0, 0, 0, 0.05)' : 'none'
                }}
              >
                {isCompleted ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  step.number
                )}
              </div>
              
              {/* Label */}
              <span 
                style={{ 
                  fontSize: '11px', 
                  fontWeight: isActive ? 700 : 500, 
                  color: isActive ? '#1D1D1F' : '#8E8E93', 
                  marginTop: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
