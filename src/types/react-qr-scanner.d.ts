declare module 'react-qr-scanner' {
    import { Component, CSSProperties } from 'react';
  
    export interface QrScannerProps {
      delay?: number;
      style?: CSSProperties;
      className?: string;
      onError?: (error: any) => void;
      onScan?: (data: { text: string } | null) => void;
      constraints?: MediaStreamConstraints;
      legacyMode?: boolean;
      facingMode?: 'user' | 'environment';
      resolution?: number;
    }
  
    export default class QrScanner extends Component<QrScannerProps> {}
  }