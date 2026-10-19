/**
 * Watermarking service that creates a permanent, burned-in pixel derivative
 * containing the official Campus Connect brand mark and university credentials.
 */

export interface WatermarkOptions {
  universityName: string;
  universityHandle: string;
  studentName?: string;
}

export async function generateWatermarkedDerivative(
  fileOrDataUrl: File | string,
  options: WatermarkOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to acquire canvas 2D rendering context'));
          return;
        }

        // Set high-fidelity dimensions matching original
        canvas.width = img.width;
        canvas.height = img.height;

        // 1. Draw unwatermarked original onto canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 2. Compute proportional badge sizing
        const baseDimension = Math.min(canvas.width, canvas.height);
        const padding = Math.max(16, baseDimension * 0.035);
        const badgeHeight = Math.max(48, baseDimension * 0.08);
        const fontSize = Math.max(14, Math.floor(badgeHeight * 0.32));
        const subFontSize = Math.max(11, Math.floor(badgeHeight * 0.22));

        const badgeWidth = Math.min(canvas.width - padding * 2, Math.max(280, baseDimension * 0.55));
        const badgeX = canvas.width - badgeWidth - padding;
        const badgeY = canvas.height - badgeHeight - padding;

        // 3. Draw rounded dark glassmorphic badge container
        const radius = Math.min(16, badgeHeight * 0.25);
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = Math.max(12, baseDimension * 0.02);
        ctx.shadowOffsetY = 4;

        ctx.beginPath();
        ctx.moveTo(badgeX + radius, badgeY);
        ctx.lineTo(badgeX + badgeWidth - radius, badgeY);
        ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + radius);
        ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - radius);
        ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - radius, badgeY + badgeHeight);
        ctx.lineTo(badgeX + radius, badgeY + badgeHeight);
        ctx.quadraticCurveTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - radius);
        ctx.lineTo(badgeX, badgeY + radius);
        ctx.quadraticCurveTo(badgeX, badgeY, badgeX + radius, badgeY);
        ctx.closePath();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'; // Deep slate with opacity
        ctx.fill();

        ctx.lineWidth = Math.max(1.5, baseDimension * 0.002);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)'; // Electric Campus Blue outline
        ctx.stroke();
        ctx.restore();

        // 4. Draw Campus Connect Brand Mark Icon
        const iconSize = badgeHeight * 0.55;
        const iconX = badgeX + padding * 0.6;
        const iconY = badgeY + (badgeHeight - iconSize) / 2;

        ctx.save();
        ctx.fillStyle = '#1D64EC';
        ctx.beginPath();
        ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.floor(iconSize * 0.55)}px 'Plus Jakarta Sans', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CC', iconX + iconSize / 2, iconY + iconSize / 2 + 1);
        ctx.restore();

        // 5. Draw Primary Brand Typography
        const textX = iconX + iconSize + padding * 0.5;
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `800 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('CAMPUS CONNECT', textX, badgeY + badgeHeight * 0.2);

        // 6. Draw Subtitle with University Handle
        ctx.fillStyle = '#93C5FD'; // Light blue
        ctx.font = `600 ${subFontSize}px 'Plus Jakarta Sans', sans-serif`;
        const handleText = `${options.universityHandle || '@campusconnect'} • VERIFIED`;
        ctx.fillText(handleText, textX, badgeY + badgeHeight * 0.55);
        ctx.restore();

        // 7. Export burned-in JPEG derivative
        const watermarkedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve(watermarkedDataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for watermarking'));
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error('Failed to read image file'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader error on image'));
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}
