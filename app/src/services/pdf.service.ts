import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { PrescripcionMedica, Paciente, Analisis } from '../types';
import { authService } from './auth.service';
import { historialService } from './historial.service';
import { pacientesService } from './pacientes.service';
import { calcularMesesDeEdad, parseDateSafe } from '../utils/helpers';

function generateSvgChart(
  historicalPoints: number[],
  projectedPoints: number[],
  idealPoints: number[],
  labels: string[],
  lineColor: string,
  title: string
): string {
  const svgW = 500;
  const svgH = 220;
  const marginTop = 25;
  const marginRight = 30;
  const marginBottom = 35;
  const marginLeft = 45;
  
  const chartW = svgW - marginLeft - marginRight;
  const chartH = svgH - marginTop - marginBottom;
  
  const yMin = 15;
  const yMax = 45;
  
  const getX = (index: number, total: number) => {
    if (total <= 1) return marginLeft + chartW / 2;
    return marginLeft + (index / (total - 1)) * chartW;
  };
  
  const getY = (val: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    return svgH - marginBottom - ((clamped - yMin) / (yMax - yMin)) * chartH;
  };

  const totalPoints = historicalPoints.length + projectedPoints.length;
  
  const gridLines = [20, 28, 30, 40].map(yVal => {
    const y = getY(yVal);
    let color = 'rgba(255,255,255,0.08)';
    let dash = '4,4';
    if (yVal === 28) {
      color = 'rgba(77, 110, 227, 0.4)';
    } else if (yVal === 30) {
      color = 'rgba(255, 71, 87, 0.4)';
    }
    return `
      <line x1="${marginLeft}" y1="${y}" x2="${svgW - marginRight}" y2="${y}" stroke="${color}" stroke-dasharray="${dash}" stroke-width="1" />
      <text x="${marginLeft - 8}" y="${y + 3}" fill="#94a3b8" font-size="9" text-anchor="end">${yVal}°</text>
    `;
  }).join('');

  const xLabels = labels.map((lbl, idx) => {
    if (idx === 0 || idx === historicalPoints.length - 1 || idx === totalPoints - 1 || (idx > 0 && idx % 3 === 0)) {
      const x = getX(idx, totalPoints);
      return `
        <line x1="${x}" y1="${marginTop}" x2="${x}" y2="${svgH - marginBottom}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
        <text x="${x}" y="${svgH - marginBottom + 16}" fill="#94a3b8" font-size="8" text-anchor="middle">${lbl}</text>
      `;
    }
    return '';
  }).join('');

  let idealPath = '';
  if (idealPoints && idealPoints.length > 0) {
    const d = idealPoints.map((val, idx) => {
      const x = getX(idx, totalPoints);
      const y = getY(val);
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    idealPath = `<path d="${d}" fill="none" stroke="rgba(0, 196, 140, 0.4)" stroke-width="1.5" stroke-dasharray="3,3" />`;
  }

  let historicalPath = '';
  let historicalDots = '';
  if (historicalPoints.length > 0) {
    const d = historicalPoints.map((val, idx) => {
      const x = getX(idx, totalPoints);
      const y = getY(val);
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    historicalPath = `<path d="${d}" fill="none" stroke="${lineColor}" stroke-width="3" />`;
    
    historicalDots = historicalPoints.map((val, idx) => {
      const x = getX(idx, totalPoints);
      const y = getY(val);
      return `
        <circle cx="${x}" cy="${y}" r="4" fill="${lineColor}" />
        <circle cx="${x}" cy="${y}" r="2" fill="#FFFFFF" />
        <text x="${x}" y="${y - 8}" fill="${lineColor}" font-size="8" font-weight="bold" text-anchor="middle">${val.toFixed(1)}°</text>
      `;
    }).join('');
  }

  let projectedPath = '';
  let projectedDots = '';
  if (projectedPoints.length > 0 && historicalPoints.length > 0) {
    const fullProjPoints = [historicalPoints[historicalPoints.length - 1], ...projectedPoints];
    const d = fullProjPoints.map((val, idx) => {
      const x = getX(historicalPoints.length - 1 + idx, totalPoints);
      const y = getY(val);
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    projectedPath = `<path d="${d}" fill="none" stroke="${lineColor}" stroke-dasharray="2,2" stroke-width="2" />`;
    
    projectedDots = projectedPoints.map((val, idx) => {
      const globalIdx = historicalPoints.length + idx;
      const x = getX(globalIdx, totalPoints);
      const y = getY(val);
      const showDetails = idx === 0 || idx === projectedPoints.length - 1 || idx === Math.floor(projectedPoints.length / 2);
      return showDetails ? `
        <circle cx="${x}" cy="${y}" r="4" fill="#0f172a" stroke="${lineColor}" stroke-width="2" />
        <text x="${x}" y="${y - 8}" fill="${lineColor}" font-size="8" font-weight="bold" text-anchor="middle">${val.toFixed(1)}°</text>
      ` : `<circle cx="${x}" cy="${y}" r="2" fill="${lineColor}" opacity="0.6" />`;
    }).join('');
  }

  return `
    <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="220" style="background-color: #0f172a; border-radius: 10px;">
      <!-- Title -->
      <text x="15" y="18" fill="#f8fafc" font-size="10" font-weight="600" letter-spacing="0.5">${title}</text>
      
      <!-- Axis -->
      <line x1="${marginLeft}" y1="${marginTop}" x2="${marginLeft}" y2="${svgH - marginBottom}" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
      <line x1="${marginLeft}" y1="${svgH - marginBottom}" x2="${svgW - marginRight}" y2="${svgH - marginBottom}" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
      
      <!-- Grids -->
      ${gridLines}
      ${xLabels}
      
      <!-- Paths -->
      ${idealPath}
      ${projectedPath}
      ${historicalPath}
      
      <!-- Data Points -->
      ${historicalDots}
      ${projectedDots}
    </svg>
  `;
}

export const pdfService = {
  /**
   * Descarga una imagen remota y la convierte a Base64
   */
  async downloadImageAsBase64(url: string): Promise<string | null> {
    if (!url) return null;
    try {
      if (url.startsWith('data:')) return url;
      
      const filename = url.split('/').pop() || `temp_${Date.now()}.jpg`;
      const localUri = `${FileSystem.cacheDirectory}${filename}`;
      
      const downloadResult = await FileSystem.downloadAsync(url, localUri);
      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download image. Status: ${downloadResult.status}`);
      }
      
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: 'base64',
      });
      return `data:image/jpeg;base64,${base64}`;
    } catch (e) {
      console.warn("[PDFService] Error al convertir imagen a base64:", e);
      return url; // Retorna la url original como fallback
    }
  },

  /**
   * Genera el PDF clínico de la prescripción y abre el menú de compartir nativo
   */
  async generarYCompartirPrescripcion(
    prescripcion: PrescripcionMedica,
    paciente: Paciente,
    analisisCargado?: Analisis | null,
    incluirGraficos: boolean = false
  ): Promise<void> {
    try {
      let svgChartIzqHtml = '';
      let svgChartDerHtml = '';
      let recoveryEstimateHtml = '';

      if (incluirGraficos) {
        try {
          const proyeccion = await pacientesService.getProyeccionClinica(paciente.id, 'meses');
          
          // Obtener datos históricos completos
          const hist = await historialService.getHistorialByPaciente(paciente.id);
          
          if (hist.length > 0 && proyeccion && !proyeccion.historial_vacio) {
            const histIzq = hist.map(a => a.anguloIzq);
            const histDer = hist.map(a => a.anguloDer);
            
            const projIzq = proyeccion.proyeccion_izq.map(p => p.angulo_proyectado);
            const projDer = proyeccion.proyeccion_der.map(p => p.angulo_proyectado);
            
            const idealIzq = proyeccion.pronostico_inicial_izq || [];
            const idealDer = proyeccion.pronostico_inicial_der || [];
            
            const labelsHist = hist.map(a => {
              const d = a.fechaRadiografia ? parseDateSafe(a.fechaRadiografia) : new Date(a.creadoEn);
              return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            });
            const labelsProj = proyeccion.proyeccion_izq.map(p => p.label);
            const labelsAll = [...labelsHist, ...labelsProj];
            
            // Generar SVGs
            const svgIzq = generateSvgChart(histIzq, projIzq, idealIzq, labelsAll, '#4D6EE3', 'Cadera Izquierda (Evolución y Proyección)');
            const svgDer = generateSvgChart(histDer, projDer, idealDer, labelsAll, '#00E5CC', 'Cadera Derecha (Evolución y Proyección)');
            
            svgChartIzqHtml = `<div class="chart-box">${svgIzq}</div>`;
            svgChartDerHtml = `<div class="chart-box">${svgDer}</div>`;

            let estimateText = '';
            if (proyeccion.ya_esta_sano) {
              estimateText = 'Ambas caderas se encuentran actualmente dentro del rango normal (&lt;28°).';
            } else if (proyeccion.meses_para_meta) {
              estimateText = `Se proyecta que las caderas alcanzarán el rango normal (&lt;28°) en aproximadamente <strong>${proyeccion.meses_para_meta} meses</strong> continuando con el tratamiento activo y la constancia de ejercicios recomendada.`;
            } else {
              estimateText = 'Se requiere del seguimiento y carga de nuevos estudios radiográficos de control para proyectar un tiempo estimado de recuperación.';
            }

            recoveryEstimateHtml = `
              <div class="page-break-avoid">
                <div class="section-title">Estimación de Tiempo y Proyección de Recuperación</div>
                <div class="recovery-box">
                  <div class="recovery-icon">🎯</div>
                  <div class="recovery-text">${estimateText}</div>
                </div>
              </div>
            `;
          }
        } catch (projErr) {
          console.warn("[PDFService] Error al obtener proyecciones para el PDF:", projErr);
        }
      }
      // 1. Obtener perfil del médico
      let medicoNombre = 'Médico Tratante';
      let medicoMatricula = 'No especificada';
      try {
        const docProfile = await authService.getProfile(prescripcion.medicoId);
        if (docProfile) {
          medicoNombre = docProfile.nombre_completo;
          medicoMatricula = docProfile.matricula_profesional || 'No especificada';
        }
      } catch (docErr) {
        console.warn("[PDFService] Error al obtener el perfil del médico:", docErr);
      }

      // 2. Obtener el análisis correspondiente si no fue pasado pero existe analisisId
      let analisis: Analisis | null = analisisCargado || null;
      if (!analisis && prescripcion.analisisId) {
        try {
          analisis = await historialService.getAnalisisById(prescripcion.analisisId);
        } catch (analisisErr) {
          console.warn("[PDFService] Error al obtener el análisis:", analisisErr);
        }
      }

      // 3. Descargar y codificar imágenes a base64 para evitar bloqueos de red o CORS en el PDF
      let originalBase64: string | null = null;
      let annotatedBase64: string | null = null;
      
      if (analisis) {
        if (analisis.imagenOriginalUrl) {
          originalBase64 = await this.downloadImageAsBase64(analisis.imagenOriginalUrl);
        }
        if (analisis.imagenAnotadaUrl) {
          annotatedBase64 = await this.downloadImageAsBase64(analisis.imagenAnotadaUrl);
        }
      }

      // 4. Formatear fechas
      const fechaPrescripcion = new Date(prescripcion.creadoEn).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'long', year: 'numeric',
      });
      const fechaProximaRev = prescripcion.proximaRevision
        ? new Date(prescripcion.proximaRevision + 'T00:00:00').toLocaleDateString('es-ES', {
            day: '2-digit', month: 'long', year: 'numeric',
          })
        : 'Pendiente de definir';

      const edadMeses = calcularMesesDeEdad(paciente.fechaNacimiento);
      const edadStr = edadMeses === 1 ? '1 mes' : `${edadMeses} meses`;

      // 5. Mapear tratamientos a etiquetas HTML
      const TRATAMIENTOS_DICT: Record<string, string> = {
        cirugia: 'Evaluación Quirúrgica',
        yeso: 'Yeso Pélvico',
        arnes: 'Arnés de Pavlik',
        ejercicios: 'Ejercicios y Rehabilitación',
        observacion: 'Observación Controlada',
      };
      
      const listaTratamientosHtml = prescripcion.tratamientos.map(t => {
        const label = TRATAMIENTOS_DICT[t] || t;
        return `<span class="treatment-badge badge-${t}">${label}</span>`;
      }).join(' ');

      // 6. Generar el contenido HTML premium
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://pasitos-firmes.ddc/prescripcion/${prescripcion.id}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Prescripción Médica DDC</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 40px;
              background-color: #ffffff;
              font-size: 13px;
              line-height: 1.5;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 20px;
              margin-bottom: 25px;
            }
            .clinic-logo {
              flex: 1;
            }
            .clinic-logo h1 {
              font-size: 24px;
              font-weight: 700;
              color: #0b1b3e;
              margin: 0;
              letter-spacing: -0.5px;
            }
            .clinic-logo p {
              margin: 3px 0 0 0;
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              font-weight: 500;
            }
            .presc-badge {
              text-align: right;
              background-color: #0b1b3e;
              color: #ffffff;
              padding: 10px 18px;
              border-radius: 8px;
            }
            .presc-badge .title {
              font-size: 10px;
              text-transform: uppercase;
              font-weight: 600;
              letter-spacing: 1px;
              margin-bottom: 3px;
              opacity: 0.8;
            }
            .presc-badge .id {
              font-size: 14px;
              font-weight: 700;
              font-family: monospace;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 25px;
            }
            .info-card {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px;
            }
            .info-card h2 {
              font-size: 12px;
              text-transform: uppercase;
              color: #4d6ee3;
              margin-top: 0;
              margin-bottom: 10px;
              letter-spacing: 0.5px;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 5px;
            }
            .info-card p {
              margin: 5px 0;
              font-size: 12px;
            }
            .info-card p strong {
              color: #334155;
            }

            .section-title {
              font-size: 14px;
              font-weight: 700;
              color: #0b1b3e;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-top: 30px;
              margin-bottom: 12px;
              border-left: 4px solid #4d6ee3;
              padding-left: 8px;
            }

            /* Tabla de análisis */
            .analysis-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .analysis-table th {
              background-color: #0b1b3e;
              color: #ffffff;
              font-weight: 600;
              font-size: 11px;
              text-transform: uppercase;
              padding: 8px 12px;
              text-align: left;
            }
            .analysis-table td {
              padding: 10px 12px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 12px;
            }
            .analysis-table tr:nth-child(even) td {
              background-color: #f8fafc;
            }
            .dx-tag {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-weight: 600;
              font-size: 10px;
              text-transform: uppercase;
            }
            .dx-NORMAL { background-color: #dcfce7; color: #15803d; }
            .dx-LIMITROFE { background-color: #fef3c7; color: #b45309; }
            .dx-DISPLASIA { background-color: #fee2e2; color: #b91c1c; }

            .graf-pill {
              display: inline-block;
              background-color: #e0e7ff;
              color: #4338ca;
              font-weight: 600;
              font-size: 11px;
              padding: 2px 10px;
              border-radius: 12px;
            }

            /* Contenedor de imágenes comparativas */
            .xrays-comparison {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin: 20px 0;
            }
            .xrays-comparison.single {
              grid-template-columns: 1fr;
              max-width: 320px;
              margin: 20px auto;
            }
            .xray-box {
              text-align: center;
              padding: 12px;
              background-color: #0f172a; /* Fondo oscuro radiografía */
              border-radius: 10px;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            }
            .xray-box img {
              max-width: 100%;
              max-height: 220px;
              border-radius: 6px;
              border: 1px solid rgba(255,255,255,0.1);
              object-fit: contain;
            }
            .xray-box p {
              color: #94a3b8;
              font-size: 10px;
              margin-top: 6px;
              margin-bottom: 0;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            /* Contenedor de gráficos */
            .charts-comparison {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin: 20px 0;
            }
            .chart-box {
              padding: 10px;
              background-color: #0f172a;
              border-radius: 12px;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            }
            .recovery-box {
              display: flex;
              align-items: center;
              gap: 15px;
              background-color: #eff6ff;
              border-left: 4px solid #3b82f6;
              padding: 15px;
              border-radius: 0 8px 8px 0;
              margin-bottom: 25px;
            }
            .recovery-icon {
              font-size: 24px;
            }
            .recovery-text {
              color: #1e3a8a;
              font-size: 13px;
              line-height: 1.5;
            }

            /* Tratamientos */
            .treatment-badges {
              margin-bottom: 15px;
            }
            .treatment-badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 6px;
              font-weight: 600;
              font-size: 11px;
              margin-right: 8px;
              margin-bottom: 8px;
              border: 1px solid;
            }
            .badge-cirugia { background-color: #fee2e2; color: #b91c1c; border-color: #fca5a5; }
            .badge-yeso { background-color: #fff1f2; color: #e11d48; border-color: #fecdd3; }
            .badge-arnes { background-color: #fffbeb; color: #d97706; border-color: #fde68a; }
            .badge-ejercicios { background-color: #ecfdf5; color: #059669; border-color: #a7f3d0; }
            .badge-observacion { background-color: #f1f5f9; color: #475569; border-color: #cbd5e1; }

            /* Indicaciones */
            .indications-box {
              background-color: #f0fdfa;
              border-left: 4px solid #0d9488;
              padding: 15px;
              border-radius: 0 8px 8px 0;
              margin-bottom: 25px;
              font-size: 12px;
            }
            .indications-box h3 {
              margin-top: 0;
              font-size: 12px;
              text-transform: uppercase;
              color: #0f766e;
              margin-bottom: 8px;
            }
            .indications-box p {
              margin: 0;
              color: #334155;
              white-space: pre-line;
            }

            /* Footer y firmas */
            .footer-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 50px;
              border-top: 1px solid #e2e8f0;
              padding-top: 25px;
            }
            .qr-box {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .qr-box img {
              width: 80px;
              height: 80px;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
            }
            .qr-text {
              font-size: 10px;
              color: #64748b;
              max-width: 150px;
            }
            .signature-box {
              text-align: center;
              min-width: 200px;
            }
            .sig-line {
              border-top: 1px solid #94a3b8;
              width: 100%;
              margin-bottom: 8px;
            }
            .sig-name {
              font-weight: 600;
              color: #0b1b3e;
              margin: 0;
              font-size: 12px;
            }
            .sig-title {
              font-size: 11px;
              color: #64748b;
              margin: 2px 0 0 0;
            }

            .page-break-avoid {
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="clinic-logo">
              <h1>PASITOS FIRMES</h1>
              <p>Clínica y Diagnóstico de Displasia de Cadera</p>
            </div>
            <div class="presc-badge">
              <div class="title">Receta / Prescripción</div>
              <div class="id">${prescripcion.id.split('-')[0].toUpperCase()}</div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-card">
              <h2>Información del Paciente</h2>
              <p><strong>Nombre:</strong> ${paciente.nombreCompleto}</p>
              <p><strong>Código:</strong> ${paciente.codigoPaciente}</p>
              <p><strong>Edad:</strong> ${edadStr} (${new Date(paciente.fechaNacimiento + 'T00:00:00').toLocaleDateString('es-ES')})</p>
              <p><strong>Sexo:</strong> ${paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}</p>
            </div>
            <div class="info-card">
              <h2>Información del Profesional</h2>
              <p><strong>Médico:</strong> Dr. ${medicoNombre}</p>
              <p><strong>Matrícula Profesional:</strong> ${medicoMatricula}</p>
              <p><strong>Fecha Emisión:</strong> ${fechaPrescripcion}</p>
              <p><strong>Próximo Control:</strong> ${fechaProximaRev}</p>
            </div>
          </div>

          ${analisis ? `
            <div class="page-break-avoid">
              <div class="section-title">Resultados del Análisis de Radiografía</div>
              <table class="analysis-table">
                <thead>
                  <tr>
                    <th>Lado Cadera</th>
                    <th>Ángulo Acetabular</th>
                    <th>Diagnóstico Clínico</th>
                    <th>Clasificación de Graf</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Cadera Izquierda (Izq)</strong></td>
                    <td>${analisis.anguloIzq.toFixed(1)}°</td>
                    <td><span class="dx-tag dx-${analisis.diagnosticoIzq}">${analisis.diagnosticoIzq}</span></td>
                    <td rowspan="2" style="vertical-align: middle; text-align: center;">
                      <span class="graf-pill">${analisis.categoriaGraf.replace('GRAF_', 'Graf ')}</span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Cadera Derecha (Der)</strong></td>
                    <td>${analisis.anguloDer.toFixed(1)}°</td>
                    <td><span class="dx-tag dx-${analisis.diagnosticoDer}">${analisis.diagnosticoDer}</span></td>
                  </tr>
                </tbody>
              </table>

              ${(originalBase64 || annotatedBase64) ? `
                <div class="xrays-comparison ${(originalBase64 && annotatedBase64) ? '' : 'single'}">
                  ${originalBase64 ? `
                    <div class="xray-box">
                      <img src="${originalBase64}" alt="Radiografía Original" />
                      <p>Radiografía Original</p>
                    </div>
                  ` : ''}
                  ${annotatedBase64 ? `
                    <div class="xray-box">
                      <img src="${annotatedBase64}" alt="Análisis IA" />
                      <p>Análisis IA (Líneas de Graf)</p>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          ` : ''}

          ${(svgChartIzqHtml || svgChartDerHtml) ? `
            <div class="page-break-avoid">
              <div class="section-title">Gráficos de Evolución de Cadera</div>
              <div class="charts-comparison">
                ${svgChartIzqHtml}
                ${svgChartDerHtml}
              </div>
              <div style="font-size: 10px; color: #64748b; margin-top: -10px; margin-bottom: 20px; text-align: center;">
                Línea continua: Historial de mediciones. Línea punteada: Proyección de evolución. Línea discontinua verde: Plan ideal.
              </div>
            </div>
          ` : ''}

          ${recoveryEstimateHtml}

          <div class="page-break-avoid">
            <div class="section-title">Diagnóstico y Plan de Tratamiento</div>
            <div class="info-card" style="margin-bottom: 20px;">
              <p><strong>Resumen Diagnóstico:</strong></p>
              <p style="font-size: 13px; color: #334155; margin-top: 5px; font-weight: 500;">
                ${prescripcion.diagnosticoResumen}
              </p>
            </div>

            <div class="treatment-badges">
              <p style="margin-bottom: 8px;"><strong>Tratamientos Indicados:</strong></p>
              ${listaTratamientosHtml}
            </div>

            ${prescripcion.indicaciones ? `
              <div class="indications-box">
                <h3>Indicaciones Específicas / Receta</h3>
                <p>${prescripcion.indicaciones}</p>
              </div>
            ` : ''}
          </div>

          <div class="footer-row page-break-avoid">
            <div class="qr-box">
              <img src="${qrUrl}" alt="Código QR de Verificación" />
              <div class="qr-text">
                Escanee el código QR para validar la autenticidad digital de esta prescripción y el historial clínico del paciente en el sistema Pasitos Firmes.
              </div>
            </div>
            
            <div class="signature-box">
              <div class="sig-line"></div>
              <p class="sig-name">Dr. ${medicoNombre}</p>
              <p class="sig-title">Matrícula Profesional: ${medicoMatricula}</p>
              <p class="sig-title">Firma Autorizada</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // 7. Imprimir a archivo PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      // 8. Compartir el PDF mediante el modal nativo
      if (await Sharing.isAvailableAsync()) {
        const cleanName = paciente.nombreCompleto.replace(/[^a-zA-Z0-9]/g, '_');
        const customName = `Prescripcion_${cleanName}_${fechaPrescripcion.replace(/\s+/g, '')}.pdf`;
        const targetUri = `${FileSystem.cacheDirectory}${customName}`;
        await FileSystem.copyAsync({
          from: uri,
          to: targetUri
        });
        
        await Sharing.shareAsync(targetUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Prescripción Médica - ${paciente.nombreCompleto}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        throw new Error("El servicio de compartir no está disponible en este dispositivo");
      }
    } catch (error: any) {
      console.error("[PDFService] Error generando PDF:", error);
      throw error;
    }
  }
};
