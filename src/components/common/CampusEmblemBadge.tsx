import React from 'react';
import { University } from '../../types';

export const getCampusMonogram = (university: { name: string; slug: string }): string => {
  const s = (university.slug || university.name).toLowerCase();
  if (s.includes('miami')) return 'MU';
  if (s.includes('virginiatech') || s === 'vt') return 'VT';
  if (s.includes('westvirginia') || s === 'wvu') return 'WVU';
  if (s.includes('michigan') || s === 'umich') return 'M';
  if (s.includes('purdue')) return 'P';
  if (s.includes('boston') || s === 'bu') return 'BU';
  if (s.includes('stonybrook') || s === 'sbu') return 'SBU';
  if (s.includes('alabama') || s === 'bama') return 'UA';
  if (s.includes('illinoisstate') || s === 'isu') return 'ISU';
  if (s.includes('virginia') || s === 'uva') return 'UVA';
  if (s.includes('ohiostate') || s === 'osu') return 'OSU';
  if (s.includes('pennstate') || s === 'psu') return 'PSU';
  if (s.includes('florida') || s === 'uf') return 'UF';
  if (s.includes('texas') || s === 'ut') return 'UT';
  if (s.includes('wisconsin') || s === 'uwmadison') return 'UW';
  if (s.includes('unc') || s.includes('carolina')) return 'UNC';
  if (s.includes('washington') || s === 'udub') return 'UW';
  if (s.includes('ucla')) return 'UCLA';
  if (s.includes('georgia') || s === 'uga') return 'UGA';
  if (s.includes('indiana') || s === 'iu') return 'IU';
  if (s.includes('eku')) return 'EKU';
  if (s.includes('thomasmore')) return 'TM';
  if (s.includes('spalding')) return 'SU';
  if (s.includes('campbellsville')) return 'CU';
  if (s.includes('georgetown')) return 'GC';
  if (s.includes('centre')) return 'CC';
  if (s.includes('bellarmine')) return 'BU';
  if (s.includes('murray')) return 'MSU';
  if (s.includes('lindsey') || s === 'lwc') return 'LWC';
  if (s.includes('morehead')) return 'MSU';
  if (s.includes('harvard')) return 'H';
  return (university.name || 'CC').slice(0, 2).toUpperCase();
};

interface CampusEmblemBadgeProps {
  university: Pick<University, 'name' | 'slug' | 'primaryColor' | 'accentColor' | 'classYear' | 'logoUrl'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CampusEmblemBadge: React.FC<CampusEmblemBadgeProps> = ({
  university,
  size = 'md',
  className = ''
}) => {
  const primaryColor = university.primaryColor || '#004B87';
  const accentColor = university.accentColor || '#0284C7';
  const classYear = university.classYear || '2031';
  const monogram = getCampusMonogram(university);

  const sizeClasses = {
    sm: {
      outer: 'w-7 h-7 p-0.5',
      monogram: 'text-[9px]',
      year: 'text-[5px]'
    },
    md: {
      outer: 'w-12 h-12 p-0.5',
      monogram: 'text-xs',
      year: 'text-[7px]'
    },
    lg: {
      outer: 'w-16 h-16 p-1',
      monogram: 'text-sm',
      year: 'text-[9px]'
    }
  }[size];

  return (
    <div 
      className={`${sizeClasses.outer} rounded-full shrink-0 flex items-center justify-center shadow-md relative ${className}`}
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 50%, #EC4899 100%)`
      }}
      title={`${university.name} Class of ${classYear}`}
    >
      <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center overflow-hidden border border-white">
        <span 
          className={`${sizeClasses.monogram} font-black tracking-tight leading-none select-none`}
          style={{ color: primaryColor }}
        >
          {monogram}
        </span>
        <span className={`${sizeClasses.year} font-black text-slate-900 leading-none mt-0.5 font-mono select-none`}>
          {classYear}
        </span>
      </div>
    </div>
  );
};
