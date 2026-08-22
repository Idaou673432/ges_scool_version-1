/**
 * SomaSikolo - Service de Génération PDF Officiel (Mali)
 * Génère des Bulletins Trimestriels, Reçus de Scolarité et Cartes Scolaires.
 */

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { ReportCard, Payment, Student, SchoolSettings, SchoolClass, TuitionInvoice, AttendanceRecord } from '../types';
import { formatFCFA, getTermLabel } from '../constants/maliEducation';

export class PdfService {
  /**
   * Internal helper to draw a single report card on a jsPDF page (Landscape A4 half-sheet)
   */
  private static renderSingleBulletinOnDoc(
    doc: jsPDF,
    reportCard: ReportCard,
    settings: SchoolSettings,
    x0: number,
    y0: number,
    w: number,
    h: number
  ): void {
    const maxScore = reportCard.maxScore || 20;
    const termLabel = getTermLabel(reportCard.term, settings?.evaluationMonths);

    // Outer border
    doc.setDrawColor(15, 23, 42); // Black / Dark Slate
    doc.setLineWidth(0.3);
    doc.rect(x0, y0, w, h);

    let y = y0 + 3;

    // 1. TOP HEADER SECTION
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    const acadText = (settings.academyName || "ACADEMIE D'ENSEIGNEMENT BAMAKO RIVE DROITE").toUpperCase();
    const capText = settings.capName ? `CAP DE ${settings.capName.toUpperCase()}` : "CAP DE FALADIE";
    const schoolText = (settings.schoolName || "ECOLE PRIVEE LE BIRGO NIAMAKORO").toUpperCase();
    const fullHeaderLine = `${acadText} ${capText} ${schoolText}`;

    doc.text(fullHeaderLine, x0 + w / 2, y, { align: 'center', maxWidth: w - 6 });
    y += 4;

    doc.setFontSize(7);
    doc.text(`TEL: ${settings.phone || '76041281 / 75167282'}`, x0 + w / 2, y, { align: 'center' });
    y += 5;

    // Title BULLETIN DE NOTES
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('BULLETIN DE NOTES', x0 + w / 2, y, { align: 'center' });
    doc.line(x0 + w / 2 - 25, y + 1, x0 + w / 2 + 25, y + 1);

    y += 5;

    // 2. TOP 3-BOX GRID
    const boxHeight = 15;
    const b1Width = w * 0.42;
    const b2Width = w * 0.22;
    const b3Width = w * 0.32;
    const gap = (w - (b1Width + b2Width + b3Width)) / 2;

    const b1X = x0;
    const b2X = b1X + b1Width + gap;
    const b3X = b2X + b2Width + gap;

    // Box 1: Left
    doc.rect(b1X, y, b1Width, boxHeight);
    doc.setFontSize(7);
    doc.setFont('Helvetica', 'bold');
    doc.text('ELEVE :', b1X + 2, y + 4);
    doc.text(reportCard.studentName.toUpperCase(), b1X + 16, y + 4, { maxWidth: b1Width - 18 });

    doc.setFont('Helvetica', 'normal');
    doc.text('N° Mle :', b1X + 2, y + 8.5);
    doc.setFont('Helvetica', 'bold');
    doc.text(reportCard.studentMatricule || '---', b1X + 16, y + 8.5);

    doc.setFont('Helvetica', 'normal');
    doc.text('CLASSE :', b1X + 2, y + 13);
    doc.setFont('Helvetica', 'bold');
    doc.text(reportCard.className.toUpperCase(), b1X + 16, y + 13);

    // Box 2: Center - Large Class Emblem
    doc.rect(b2X, y, b2Width, boxHeight);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(reportCard.className.toUpperCase(), b2X + b2Width / 2, y + 9.5, { align: 'center' });

    // Box 3: Right
    doc.rect(b3X, y, b3Width, boxHeight);
    doc.setFontSize(7);
    doc.setFont('Helvetica', 'normal');
    doc.text('Année scolaire', b3X + 2, y + 4);
    doc.setFont('Helvetica', 'bold');
    doc.text(reportCard.academicYear, b3X + b3Width - 2, y + 4, { align: 'right' });

    doc.setFont('Helvetica', 'bold');
    doc.text(termLabel.toUpperCase(), b3X + b3Width / 2, y + 8.5, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.text('Effectif de la Classe:', b3X + 2, y + 13);
    doc.setFont('Helvetica', 'bold');
    doc.text(String(reportCard.totalClassStudents), b3X + b3Width - 2, y + 13, { align: 'right' });

    y += boxHeight + 3;

    // 3. MAIN GRADES TABLE
    const colW = [
      w * 0.32, // MATIERES
      w * 0.08, // COEF
      w * 0.15, // NOTES DE CLASSE
      w * 0.15, // NOTE DE COMP
      w * 0.10, // MOY GEN
      w * 0.10, // NOTES COEF
      w * 0.10  // APPRECIATIONS
    ];

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(x0, y, w, 6, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);

    let xCursor = x0;
    doc.text('MATIERES', xCursor + 2, y + 4);
    xCursor += colW[0];
    doc.line(xCursor, y, xCursor, y + 6);

    doc.text('COEF', xCursor + colW[1] / 2, y + 4, { align: 'center' });
    xCursor += colW[1];
    doc.line(xCursor, y, xCursor, y + 6);

    doc.text(maxScore === 10 ? 'N.CLASSE/10' : 'NOTES DE CLASSE SUR 20', xCursor + colW[2] / 2, y + 4, { align: 'center' });
    xCursor += colW[2];
    doc.line(xCursor, y, xCursor, y + 6);

    doc.text(maxScore === 10 ? 'COMPOS/10' : 'NOTE DE COMP SUR 40', xCursor + colW[3] / 2, y + 4, { align: 'center' });
    xCursor += colW[3];
    doc.line(xCursor, y, xCursor, y + 6);

    doc.text('MOY GEN', xCursor + colW[4] / 2, y + 4, { align: 'center' });
    xCursor += colW[4];
    doc.line(xCursor, y, xCursor, y + 6);

    doc.text('NOTES COEF', xCursor + colW[5] / 2, y + 4, { align: 'center' });
    xCursor += colW[5];
    doc.line(xCursor, y, xCursor, y + 6);

    doc.text('APPRECIATIONS', xCursor + colW[6] / 2, y + 4, { align: 'center' });

    y += 6;

    // Table Rows
    const rowH = 4.5;
    doc.setFontSize(6.5);

    reportCard.subjectAverages.forEach((sub) => {
      const classVal = sub.classScore !== undefined ? sub.classScore : sub.finalScore;
      const compVal = sub.compositionScore !== undefined ? sub.compositionScore : (maxScore === 10 ? sub.finalScore : sub.finalScore * 2);

      doc.rect(x0, y, w, rowH);

      let xPos = x0;
      // MATIERES
      doc.setFont('Helvetica', 'bold');
      doc.text(sub.subjectName.toUpperCase(), xPos + 1.5, y + 3.2, { maxWidth: colW[0] - 2 });
      xPos += colW[0];
      doc.line(xPos, y, xPos, y + rowH);

      // COEF
      doc.setFont('Helvetica', 'bold');
      doc.text(String(sub.coefficient), xPos + colW[1] / 2, y + 3.2, { align: 'center' });
      xPos += colW[1];
      doc.line(xPos, y, xPos, y + rowH);

      // N.CLASSE
      doc.setFont('Helvetica', 'normal');
      doc.text(classVal.toFixed(2).replace('.', ','), xPos + colW[2] / 2, y + 3.2, { align: 'center' });
      xPos += colW[2];
      doc.line(xPos, y, xPos, y + rowH);

      // N.COMP
      doc.text(compVal.toFixed(2).replace('.', ','), xPos + colW[3] / 2, y + 3.2, { align: 'center' });
      xPos += colW[3];
      doc.line(xPos, y, xPos, y + rowH);

      // MOY GEN
      doc.setFont('Helvetica', 'bold');
      doc.text(sub.finalScore.toFixed(2).replace('.', ','), xPos + colW[4] / 2, y + 3.2, { align: 'center' });
      xPos += colW[4];
      doc.line(xPos, y, xPos, y + rowH);

      // NOTES COEF
      doc.text(sub.weightedScore.toFixed(2).replace('.', ','), xPos + colW[5] / 2, y + 3.2, { align: 'center' });
      xPos += colW[5];
      doc.line(xPos, y, xPos, y + rowH);

      // APPRECIATIONS
      const apprText = sub.appreciation || (sub.finalScore >= 16 ? 'EXCELLENT' : sub.finalScore >= 14 ? 'BIEN' : sub.finalScore >= 12 ? 'ASSEZ-BIEN' : sub.finalScore >= 10 ? 'PASSABLE' : sub.finalScore >= 8 ? 'INSUFFISANT' : 'MAL');
      doc.setFont('Helvetica', 'normal');
      doc.text(apprText.toUpperCase(), xPos + 1, y + 3.2, { maxWidth: colW[6] - 1 });

      y += rowH;
    });

    // TOTAL COEFFICIENTS ROW
    doc.rect(x0, y, w, rowH);
    doc.setFont('Helvetica', 'bold');
    doc.text('TOTAL DES COEFFICIENTS', x0 + 2, y + 3.2);
    let totalX = x0 + colW[0];
    doc.line(totalX, y, totalX, y + rowH);
    doc.text(String(reportCard.totalCoefficients), totalX + colW[1] / 2, y + 3.2, { align: 'center' });
    totalX += colW[1];
    doc.line(totalX, y, totalX, y + rowH);

    y += rowH;

    // TOTAL NOTES COEFFICIEES ROW
    doc.rect(x0, y, w, rowH);
    doc.text('TOTAL DES NOTES COEFFICIEES', x0 + 2, y + 3.2);
    let totalX2 = x0 + colW[0] + colW[1] + colW[2] + colW[3] + colW[4];
    doc.line(totalX2, y, totalX2, y + rowH);
    doc.text(reportCard.totalPoints.toFixed(2).replace('.', ','), totalX2 + colW[5] / 2, y + 3.2, { align: 'center' });
    totalX2 += colW[5];
    doc.line(totalX2, y, totalX2, y + rowH);

    y += rowH;

    // MOYENNE & RANG ROW
    doc.setFillColor(248, 250, 252);
    doc.rect(x0, y, w, 5.5, 'FD');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(`MOYENNE DE L'ELEVE : ${reportCard.generalAverage.toFixed(2).replace('.', ',')}`, x0 + 2, y + 3.8);
    doc.text(`RANG : ${reportCard.rankInClass} / ${reportCard.totalClassStudents}`, x0 + w / 2 + 10, y + 3.8);

    y += 7.5;

    // 4. BOTTOM APPRECIATION & SIGNATURE BLOCK
    const botH = h - (y - y0) - 2;
    if (botH > 8) {
      doc.rect(x0, y, w, botH);
      doc.setFontSize(6.5);
      doc.setFont('Helvetica', 'bold');
      doc.text('Appréciation du Directeur :', x0 + 2, y + 4);

      const directorAppr = reportCard.generalAverage >= 14 ? 'BIEN - FELICITATIONS' : reportCard.generalAverage >= 10 ? 'PASSABLE - SATISFAISANT' : reportCard.generalAverage >= 8 ? 'INSUFFISANT' : 'MEDIOCRE';
      doc.text(directorAppr, x0 + 35, y + 4);

      doc.setFont('Helvetica', 'normal');
      doc.text(`${settings.city || 'Bamako'} le ...../...../${new Date().getFullYear()}`, x0 + 2, y + botH - 2.5);

      doc.setFont('Helvetica', 'bold');
      doc.text('Le Directeur', x0 + w - 20, y + botH - 2.5, { align: 'center' });

      if (settings.stampUrl) {
        try {
          doc.addImage(settings.stampUrl, 'PNG', x0 + w - 32, y + 2, 24, 12);
        } catch (e) {
          // ignore error if format non-PNG/JPEG
        }
      }
    }
  }

  /**
   * Génère le Bulletin Trimestriel Officiel (Mali) en PDF (2 bulletins côte à côte sur 1 page A4 Paysage)
   */
  public static async generateReportCardPdf(
    reportCard: ReportCard,
    settings: SchoolSettings
  ): Promise<void> {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    this.renderSingleBulletinOnDoc(doc, reportCard, settings, 6, 6, 138, 198);
    this.renderSingleBulletinOnDoc(doc, reportCard, settings, 153, 6, 138, 198);
    doc.save(`Bulletin_${reportCard.studentMatricule}_${reportCard.term}.pdf`);
  }

  /**
   * Génère un seul PDF multi-pages contenant TOUS les bulletins de la classe (2 bulletins par page A4 Paysage)
   */
  public static async generateClassReportCardsPdf(
    reportCards: ReportCard[],
    settings: SchoolSettings,
    className: string
  ): Promise<void> {
    if (reportCards.length === 0) return;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    for (let i = 0; i < reportCards.length; i += 2) {
      if (i > 0) {
        doc.addPage('a4', 'landscape');
      }
      const rc1 = reportCards[i];
      const rc2 = reportCards[i + 1] || reportCards[i];
      this.renderSingleBulletinOnDoc(doc, rc1, settings, 6, 6, 138, 198);
      this.renderSingleBulletinOnDoc(doc, rc2, settings, 153, 6, 138, 198);
    }

    const safeClassName = className.replace(/[^a-zA-Z0-9_-]/g, '_');
    const term = reportCards[0]?.term || 'TRIMESTRE';
    doc.save(`Bulletins_Classe_${safeClassName}_${term}.pdf`);
  }

  /**
   * Helper pour gérer la sortie du PDF (Impression directe en navigateur ou Téléchargement)
   */
  private static handlePdfOutput(
    doc: jsPDF,
    filename: string,
    action: 'download' | 'print' = 'print'
  ): void {
    if (action === 'print') {
      try {
        doc.autoPrint();
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        const printWin = window.open(blobUrl, '_blank');
        if (!printWin) {
          doc.save(filename);
        }
      } catch (err) {
        console.warn('Impression directe impossible via popup (restriction iframe), téléchargement du PDF :', err);
        doc.save(filename);
      }
    } else {
      doc.save(filename);
    }
  }

  /**
   * Génère le Reçu Officiel de Paiement (Format A5 Paysage)
   */
  public static generateReceiptPdf(
    payment: Payment,
    settings: SchoolSettings,
    action: 'download' | 'print' = 'print'
  ): void {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [148, 210] // Format A5 paysage
    });

    const primaryColor = [5, 150, 105];

    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(1);
    doc.rect(5, 5, 200, 138);

    // Logo si disponible
    let startXName = 12;
    if (settings.logoUrl) {
      try {
        doc.addImage(settings.logoUrl, 'PNG', 12, 8, 16, 16);
        startXName = 32;
      } catch (e) {
        console.warn('Erreur affichage logo reçus', e);
      }
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(settings.schoolName.toUpperCase(), startXName, 15);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(`${settings.address} - ${settings.city} | Tél: ${settings.phone}`, startXName, 20);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(`REÇU DE CAISSE N° ${payment.receiptNumber}`, 120, 15);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Date : ${new Date(payment.paymentDate).toLocaleDateString('fr-FR')}`, 120, 20);

    doc.line(12, 24, 198, 24);

    // Métadonnées du paiement
    doc.setFont('Helvetica', 'bold');
    doc.text(`Reçu de l'Élève : `, 12, 32);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${payment.studentName} (Matricule : ${payment.studentMatricule})`, 45, 32);

    doc.setFont('Helvetica', 'bold');
    doc.text(`Classe : `, 12, 39);
    doc.setFont('Helvetica', 'normal');
    doc.text(payment.className, 30, 39);

    doc.setFont('Helvetica', 'bold');
    doc.text(`Motif du Paiement : `, 12, 46);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${payment.category} ${payment.monthCovered ? '- ' + payment.monthCovered : ''}`, 48, 46);

    doc.setFont('Helvetica', 'bold');
    doc.text(`Mode de Règlement : `, 12, 53);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${payment.method} ${payment.referenceNumber ? '(Réf: ' + payment.referenceNumber + ')' : ''}`, 50, 53);

    // Tableau Récapitulatif
    doc.setFillColor(245, 245, 245);
    doc.rect(12, 60, 186, 25, 'F');
    doc.rect(12, 60, 186, 25);

    doc.setFont('Helvetica', 'bold');
    doc.text(`Montant Attendu : ${formatFCFA(payment.expectedAmount)}`, 18, 68);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(11);
    doc.text(`Montant Versé : ${formatFCFA(payment.amountPaid)}`, 18, 76);

    doc.setTextColor(220, 38, 38);
    doc.setFontSize(9);
    doc.text(`Reste à Payer : ${formatFCFA(payment.remainingAmount)}`, 110, 76);

    // Signature et Cachet Officiel
    doc.setTextColor(0, 0, 0);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Le Caissier / Comptable', 130, 95);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(payment.cashierName, 130, 101);

    if (settings.stampUrl) {
      try {
        doc.addImage(settings.stampUrl, 'PNG', 125, 103, 38, 24);
      } catch (e) {
        console.warn('Erreur affichage cachet PDF:', e);
      }
    } else {
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text('(Cachet & Signature)', 130, 108);
    }

    this.handlePdfOutput(doc, `Recu_${payment.receiptNumber}.pdf`, action);
  }

  /**
   * Génère le Reçu Officiel A4 Grand Format avec Relevé Financier
   */
  public static generateReceiptA4Pdf(
    payment: Payment,
    settings: SchoolSettings,
    action: 'download' | 'print' = 'print'
  ): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = [15, 23, 42]; // Slate 900
    const emeraldColor = [5, 150, 105];

    // En-tête officiel
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('RÉPUBLIQUE DU MALI', 15, 12);
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('Un Peuple - Un But - Une Foi', 15, 16);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('MINISTÈRE DE L\'ÉDUCATION NATIONALE', 120, 12);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(settings.academyName.toUpperCase(), 120, 16);
    doc.text(settings.capName.toUpperCase(), 120, 20);

    doc.setDrawColor(200, 200, 200);
    doc.line(15, 23, 195, 23);

    // Logo & Titre de l'établissement
    let textX = 15;
    if (settings.logoUrl) {
      try {
        doc.addImage(settings.logoUrl, 'PNG', 15, 26, 18, 18);
        textX = 36;
      } catch (e) {
        console.warn('Erreur logo A4', e);
      }
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
    doc.text(settings.schoolName.toUpperCase(), textX, 31);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Adresse: ${settings.address} - ${settings.city} | Tél: ${settings.phone}`, textX, 36);
    doc.text(`N° Décision: ${settings.registrationNumber} | Année Scolaire: ${payment.academicYear}`, textX, 40);

    // Bannière Reçu A4
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(15, 45, 180, 10, 2, 2, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(`REÇU OFFICIEL DE CAISSE ET ENCAISSEMENT N° ${payment.receiptNumber}`, 105, 51.5, { align: 'center' });

    // Fiche Élève & Règlement
    doc.setDrawColor(220, 226, 230);
    doc.rect(15, 58, 180, 40);

    doc.setTextColor(0, 0, 0);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Nom & Prénom Élève :`, 20, 65);
    doc.setFont('Helvetica', 'normal');
    doc.text(payment.studentName.toUpperCase(), 60, 65);

    doc.setFont('Helvetica', 'bold');
    doc.text(`Matricule :`, 20, 72);
    doc.setFont('Helvetica', 'normal');
    doc.text(payment.studentMatricule, 40, 72);

    doc.setFont('Helvetica', 'bold');
    doc.text(`Classe Attribuée :`, 20, 79);
    doc.setFont('Helvetica', 'normal');
    doc.text(payment.className, 52, 79);

    doc.setFont('Helvetica', 'bold');
    doc.text(`Motif du Règlement :`, 20, 86);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${payment.category} ${payment.monthCovered ? ' - ' + payment.monthCovered : ''}`, 58, 86);

    doc.setFont('Helvetica', 'bold');
    doc.text(`Date de Paiement :`, 120, 65);
    doc.setFont('Helvetica', 'normal');
    doc.text(new Date(payment.paymentDate).toLocaleDateString('fr-FR'), 155, 65);

    doc.setFont('Helvetica', 'bold');
    doc.text(`Mode de Règlement :`, 120, 72);
    doc.setFont('Helvetica', 'normal');
    doc.text(payment.method, 155, 72);

    doc.setFont('Helvetica', 'bold');
    doc.text(`Caissier Émetteur :`, 120, 79);
    doc.setFont('Helvetica', 'normal');
    doc.text(payment.cashierName, 155, 79);

    // Tableau Financier
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 105, 180, 30, 'F');
    doc.rect(15, 105, 180, 30);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`DÉTAILS DES MONTANTS ENCAISSÉS (FCFA)`, 20, 112);

    doc.setFontSize(9);
    doc.text(`Montant Attendu / Tarif Officiel :`, 20, 120);
    doc.text(formatFCFA(payment.expectedAmount), 180, 120, { align: 'right' });

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
    doc.text(`Montant Total Versé à la Caisse :`, 20, 127);
    doc.text(formatFCFA(payment.amountPaid), 180, 127, { align: 'right' });

    doc.setTextColor(225, 29, 72);
    doc.text(`Solde Restant à Payer :`, 20, 134);
    doc.text(formatFCFA(payment.remainingAmount), 180, 134, { align: 'right' });

    // Observations
    doc.setTextColor(0, 0, 0);
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('NB: Ce reçu tenant lieu de preuve officielle d\'encaissement doit être conservé par le tuteur légal.', 15, 142);

    // Signatures & Cachet
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Signature du Tuteur / Parent', 25, 155);
    doc.text('Le Caissier / Chef Comptable', 125, 155);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Cachet Officiel ${settings.schoolName}`, 125, 162);

    if (settings.stampUrl) {
      try {
        doc.addImage(settings.stampUrl, 'PNG', 122, 165, 45, 28);
      } catch (e) {
        console.warn('Erreur affichage cachet A4 PDF:', e);
      }
    }

    this.handlePdfOutput(doc, `Recu_A4_${payment.receiptNumber}.pdf`, action);
  }

  /**
   * Génère le Ticket de Caisse Thermique POS 80mm
   */
  public static generateReceiptPosTicketPdf(
    payment: Payment,
    settings: SchoolSettings,
    action: 'download' | 'print' = 'print'
  ): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 165] // POS Ticket 80mm
    });

    let y = 8;

    // Logo sur ticket POS si présent
    if (settings.logoUrl) {
      try {
        doc.addImage(settings.logoUrl, 'PNG', 32, y, 16, 16);
        y += 18;
      } catch (e) {
        console.warn('Erreur logo POS', e);
      }
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(settings.schoolName.toUpperCase(), 40, y, { align: 'center' });

    y += 5;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`${settings.city} | Tél: ${settings.phone}`, 40, y, { align: 'center' });

    y += 4;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`TICKET DE CAISSE N° ${payment.receiptNumber}`, 40, y, { align: 'center' });

    y += 3;
    doc.line(5, y, 75, y);

    y += 4;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('ÉLÈVE:', 5, y);
    doc.setFont('Helvetica', 'normal');
    doc.text(payment.studentName, 22, y);

    y += 4;
    doc.setFont('Helvetica', 'bold');
    doc.text('MATRICULE:', 5, y);
    doc.setFont('Helvetica', 'normal');
    doc.text(payment.studentMatricule, 24, y);

    y += 4;
    doc.setFont('Helvetica', 'bold');
    doc.text('CLASSE:', 5, y);
    doc.setFont('Helvetica', 'normal');
    doc.text(payment.className, 22, y);

    y += 4;
    doc.setFont('Helvetica', 'bold');
    doc.text('MOTIF:', 5, y);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${payment.category} ${payment.monthCovered ? '(' + payment.monthCovered + ')' : ''}`, 22, y);

    y += 4;
    doc.setFont('Helvetica', 'bold');
    doc.text('MODE:', 5, y);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${payment.method}`, 22, y);

    y += 3;
    doc.line(5, y, 75, y);

    y += 5;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('MONTANT VERSÉ:', 5, y);
    doc.text(formatFCFA(payment.amountPaid), 75, y, { align: 'right' });

    y += 4;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('SOLDE RESTANT:', 5, y);
    doc.text(formatFCFA(payment.remainingAmount), 75, y, { align: 'right' });

    y += 4;
    doc.line(5, y, 75, y);

    y += 5;
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(6);
    doc.text('Merci pour votre paiement!', 40, y, { align: 'center' });
    y += 3;
    doc.text(`Caissier: ${payment.cashierName}`, 40, y, { align: 'center' });

    // Cachet sur ticket POS
    if (settings.stampUrl) {
      try {
        y += 2;
        doc.addImage(settings.stampUrl, 'PNG', 25, y, 30, 18);
      } catch (e) {
        console.warn('Erreur cachet POS', e);
      }
    }

    this.handlePdfOutput(doc, `Ticket_POS_${payment.receiptNumber}.pdf`, action);
  }

  /**
   * Génère la Liste de Classe Officielle (PDF A4)
   */
  public static generateClassListPdf(
    className: string,
    students: Student[],
    settings: SchoolSettings
  ): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = [15, 23, 42]; // Slate 900

    // En-tête
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('RÉPUBLIQUE DU MALI', 15, 12);
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('Un Peuple - Un But - Une Foi', 15, 16);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('MINISTÈRE DE L\'ÉDUCATION NATIONALE', 120, 12);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(settings.academyName.toUpperCase(), 120, 16);
    doc.text(settings.capName.toUpperCase(), 120, 20);

    doc.setDrawColor(200, 200, 200);
    doc.line(15, 23, 195, 23);

    // Titre
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`LISTE OFFICIELLE DES ÉLÈVES — CLASSE DE ${className.toUpperCase()}`, 15, 32);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Établissement: ${settings.schoolName} | Année Scolaire: ${settings.currentAcademicYear} | Total Élèves: ${students.length}`, 15, 37);

    // Tableau élèves
    let y = 43;
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, 180, 7, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('N°', 18, y + 5);
    doc.text('MATRICULE', 28, y + 5);
    doc.text('NOM & PRÉNOM', 60, y + 5);
    doc.text('SEXE', 125, y + 5);
    doc.text('DATE NAISS.', 142, y + 5);
    doc.text('STATUT', 170, y + 5);

    y += 7;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);

    students.forEach((std, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 180, 6, 'F');
      }
      doc.rect(15, y, 180, 6);
      doc.text(String(idx + 1), 18, y + 4.5);
      doc.text(std.matricule, 28, y + 4.5);
      doc.text(`${std.lastName.toUpperCase()} ${std.firstName}`, 60, y + 4.5);
      doc.text(std.gender === 'F' ? 'Féminin' : 'Masculin', 125, y + 4.5);
      doc.text(std.birthDate || 'N/A', 142, y + 4.5);
      doc.text(std.status, 170, y + 4.5);
      y += 6;
    });

    // Pied de page
    y += 10;
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(`Fait à ${settings.city}, le ` + new Date().toLocaleDateString('fr-FR'), 15, y);
    doc.setFont('Helvetica', 'bold');
    doc.text('Le Directeur de l\'Établissement', 130, y);

    doc.save(`Liste_Classe_${className.replace(/\s+/g, '_')}.pdf`);
  }

  /**
   * Génère la Fiche de Paie / Attestation de Salaire de l'Enseignant (FCFA)
   */
  public static generateTeacherSalarySlipPdf(
    teacher: any,
    settings: SchoolSettings
  ): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = [30, 58, 138]; // Blue 900

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(settings.schoolName.toUpperCase(), 15, 15);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${settings.address} - ${settings.city} | Tél: ${settings.phone}`, 15, 20);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('BULLETIN DE PAIE & SALAIRE ENSEIGNANT', 105, 32, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.setDrawColor(30, 58, 138);
    doc.line(15, 36, 195, 36);

    // Détails Enseignant
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 42, 180, 30, 'F');
    doc.rect(15, 42, 180, 30);

    doc.setTextColor(0, 0, 0);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Matricule : `, 20, 50);
    doc.setFont('Helvetica', 'normal');
    doc.text(teacher.matricule, 45, 50);

    doc.setFont('Helvetica', 'bold');
    doc.text(`Nom & Prénom : `, 20, 57);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${teacher.lastName.toUpperCase()} ${teacher.firstName}`, 50, 57);

    doc.setFont('Helvetica', 'bold');
    doc.text(`Spécialité : `, 20, 64);
    doc.setFont('Helvetica', 'normal');
    doc.text(teacher.specialty, 45, 64);

    doc.setFont('Helvetica', 'bold');
    doc.text(`Période : `, 120, 50);
    doc.setFont('Helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase(), 140, 50);

    doc.setFont('Helvetica', 'bold');
    doc.text(`Diplôme : `, 120, 57);
    doc.setFont('Helvetica', 'normal');
    doc.text(teacher.diploma, 140, 57);

    // Éléments de Rémunération
    let y = 80;
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, 180, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('DÉSIGNATION', 20, y + 5.5);
    doc.text('MONTANT (FCFA)', 150, y + 5.5);

    y += 8;
    doc.setFont('Helvetica', 'normal');
    doc.rect(15, y, 180, 8);
    doc.text('Salaire de Base Mensuel', 20, y + 5.5);
    doc.text(formatFCFA(teacher.monthlySalary), 150, y + 5.5);

    y += 8;
    doc.rect(15, y, 180, 8);
    doc.text('Primes de Technicité & Enseignement', 20, y + 5.5);
    doc.text(formatFCFA(15000), 150, y + 5.5);

    y += 8;
    doc.setFillColor(239, 246, 255);
    doc.rect(15, y, 180, 10, 'F');
    doc.rect(15, y, 180, 10);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('NET À PAYER (FCFA)', 20, y + 6.5);
    doc.text(formatFCFA(teacher.monthlySalary + 15000), 150, y + 6.5);

    // Signature
    y += 30;
    doc.setTextColor(0, 0, 0);
    doc.text('L\'Enseignant', 30, y);
    doc.text('La Comptabilité / Le Directeur', 125, y);

    doc.save(`Fiche_Paie_${teacher.matricule}.pdf`);
  }

  /**
   * Génère le Rapport Statistique Officiel MEN Mali
   */
  public static generateMenOfficialReportPdf(
    stats: any,
    students: Student[],
    classes: any[],
    settings: SchoolSettings
  ): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = [5, 150, 105];

    // En-tête officiel
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('RÉPUBLIQUE DU MALI', 15, 12);
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('Un Peuple - Un But - Une Foi', 15, 16);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('MINISTÈRE DE L\'ÉDUCATION NATIONALE', 120, 12);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(settings.academyName.toUpperCase(), 120, 16);
    doc.text(settings.capName.toUpperCase(), 120, 20);

    doc.setDrawColor(200, 200, 200);
    doc.line(15, 23, 195, 23);

    // Titre
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(15, 28, 180, 10, 2, 2, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(`RAPPORT STATISTIQUE ANNUEL DE L'ÉTABLISSEMENT - ${settings.currentAcademicYear}`, 105, 34.5, { align: 'center' });

    // Résumé Établissement
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`Nom de l'Établissement: ${settings.schoolName}`, 15, 45);
    doc.text(`Commune / Ville: ${settings.city}`, 15, 50);
    doc.text(`Décision d'Ouverture: N° ${settings.registrationNumber}`, 15, 55);

    const girlsCount = students.filter(s => s.gender === 'F').length;
    const boysCount = students.filter(s => s.gender === 'M').length;
    const gpi = boysCount > 0 ? (girlsCount / boysCount).toFixed(2) : '1.00';

    // Grid synthèse
    doc.rect(15, 62, 180, 28);
    doc.setFont('Helvetica', 'bold');
    doc.text('INDICATEURS CLÉS DE PERFORMANCE & PARITÉ', 20, 68);
    doc.line(15, 71, 195, 71);

    doc.setFont('Helvetica', 'normal');
    doc.text(`• Effectif Total Renseigné : ${stats.totalStudents} élèves`, 20, 77);
    doc.text(`• Filles : ${girlsCount} (${((girlsCount / (stats.totalStudents || 1)) * 100).toFixed(1)}%)`, 20, 83);
    doc.text(`• Garçons : ${boysCount} (${((boysCount / (stats.totalStudents || 1)) * 100).toFixed(1)}%)`, 110, 83);

    doc.setFont('Helvetica', 'bold');
    doc.text(`• Indice de Parité de Genre (IPG) : ${gpi}`, 20, 88);

    // Tableau Répartition par Classe
    let y = 97;
    doc.setFillColor(240, 240, 240);
    doc.rect(15, y, 180, 7, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.text('CLASSE', 18, y + 5);
    doc.text('EFFECTIF TOTAL', 70, y + 5);
    doc.text('FILLES', 110, y + 5);
    doc.text('GARÇONS', 140, y + 5);
    doc.text('ENSEIGNANTS', 170, y + 5);

    y += 7;
    doc.setFont('Helvetica', 'normal');
    classes.forEach((c, idx) => {
      const cStudents = students.filter(s => s.classId === c.id);
      const cGirls = cStudents.filter(s => s.gender === 'F').length;
      const cBoys = cStudents.filter(s => s.gender === 'M').length;

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 180, 6, 'F');
      }
      doc.rect(15, y, 180, 6);
      doc.text(c.name, 18, y + 4.5);
      doc.text(String(cStudents.length), 70, y + 4.5);
      doc.text(String(cGirls), 110, y + 4.5);
      doc.text(String(cBoys), 140, y + 4.5);
      doc.text(c.mainTeacherName || 'Attribué', 170, y + 4.5);
      y += 6;
    });

    // Bilan Financier
    y += 10;
    doc.setFont('Helvetica', 'bold');
    doc.text('RÉCAPITULATIF RECOUVREMENT FINANCIER', 15, y);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Total Encaissements FCFA: ${formatFCFA(stats.totalRevenueFCFA)}`, 15, y + 6);

    // Signatures
    y += 20;
    doc.setFont('Helvetica', 'bold');
    doc.text('Le Chef d\'Établissement / Directeur', 120, y);
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(`Fait à ${settings.city}, le ` + new Date().toLocaleDateString('fr-FR'), 120, y + 5);

    doc.save(`Rapport_ MEN_Mali_${settings.currentAcademicYear}.pdf`);
  }

  /**
   * Génère les Cartes Scolaires / Badges au Format PDF (A4 - 6 cartes par page)
   */
  public static async generateStudentCardsBatchPdf(
    students: Student[],
    classes: SchoolClass[],
    settings: SchoolSettings
  ): Promise<void> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const cardWidth = 86; // Largeur standard badge mm
    const cardHeight = 54; // Hauteur standard badge mm
    const startX = 15;
    const startY = 15;
    const gapX = 10;
    const gapY = 10;

    let col = 0;
    let row = 0;

    for (let i = 0; i < students.length; i++) {
      const std = students[i];
      const cls = classes.find(c => c.id === std.classId);
      const qrDataUrl = await PdfService.generateStudentCardQr(std);

      if (row >= 4) { // 2 colonnes x 4 rangées = 8 cartes par page A4
        doc.addPage();
        col = 0;
        row = 0;
      }

      const x = startX + col * (cardWidth + gapX);
      const y = startY + row * (cardHeight + gapY);

      // Fond Carte Bleu Nuit
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F');
      doc.setDrawColor(30, 58, 138);
      doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'S');

      // Ruban Couleurs Mali (Vert, Jaune, Rouge)
      doc.setFillColor(16, 185, 129); doc.rect(x, y, cardWidth / 3, 1.5, 'F');
      doc.setFillColor(251, 191, 36); doc.rect(x + cardWidth / 3, y, cardWidth / 3, 1.5, 'F');
      doc.setFillColor(225, 29, 72); doc.rect(x + (cardWidth / 3) * 2, y, cardWidth / 3, 1.5, 'F');

      // En-tête Établissement
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(settings.schoolName.toUpperCase(), x + 4, y + 6);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(203, 213, 225);
      doc.text(`RÉPUBLIQUE DU MALI • ${settings.currentAcademicYear}`, x + 4, y + 9);

      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.1);
      doc.line(x + 4, y + 10.5, x + cardWidth - 4, y + 10.5);

      // Photo ou Initiale
      if (std.photoUrl) {
        try {
          doc.addImage(std.photoUrl, 'JPEG', x + 4, y + 12, 18, 22);
        } catch {
          doc.setFillColor(30, 41, 59);
          doc.rect(x + 4, y + 12, 18, 22, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.text(`${std.firstName.charAt(0)}${std.lastName.charAt(0)}`, x + 10, y + 24);
        }
      } else {
        doc.setFillColor(30, 41, 59);
        doc.rect(x + 4, y + 12, 18, 22, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(`${std.firstName.charAt(0)}${std.lastName.charAt(0)}`, x + 10, y + 24);
      }

      // Informations Élève
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(5);
      doc.text('NOM & PRÉNOM', x + 24, y + 14);
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(`${std.lastName.toUpperCase()} ${std.firstName}`, x + 24, y + 17.5);

      doc.setTextColor(148, 163, 184);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(5);
      doc.text('CLASSE & SEXE', x + 24, y + 22);
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(`${cls?.name || 'Inconnue'} (${std.gender})`, x + 24, y + 25);

      doc.setTextColor(148, 163, 184);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(5);
      doc.text('MATRICULE MLE', x + 24, y + 29.5);
      doc.setTextColor(251, 191, 36); // Amber
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(std.matricule, x + 24, y + 33);

      // QR Code
      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', x + cardWidth - 21, y + 12, 17, 17);
      }

      // Pied de carte
      doc.setFillColor(30, 41, 59);
      doc.rect(x, y + cardHeight - 8, cardWidth, 8, 'F');
      doc.setTextColor(251, 191, 36);
      doc.setFontSize(5);
      doc.text('CARTE SCOLAIRE OFFICIELLE', x + 4, y + cardHeight - 3);
      doc.setTextColor(255, 255, 255);
      doc.text(`VAL: 31/07/${settings.currentAcademicYear.split('-')[1] || '2025'}`, x + cardWidth - 25, y + cardHeight - 3);

      col++;
      if (col >= 2) {
        col = 0;
        row++;
      }
    }

    doc.save(`Badges_Scolaires_${settings.currentAcademicYear}.pdf`);
  }

  /**
   * Génère la Carte Scolaire Numérique
   */
  public static async generateStudentCardQr(student: Student): Promise<string> {
    const payload = JSON.stringify({
      matricule: student.matricule,
      name: `${student.firstName} ${student.lastName}`,
      status: student.status,
      year: student.academicYear
    });
    return QRCode.toDataURL(payload);
  }

  /**
   * Génère le Rapport Général Transversal Multi-Modules (PDF A4)
   */
  public static generateCrossModuleReportPdf(
    reportTitle: string,
    filtersSummary: string,
    rows: Array<{
      matricule: string;
      studentName: string;
      className: string;
      average: string;
      totalPaidFCFA: string;
      remainingFCFA: string;
      status: string;
    }>,
    totals: {
      studentCount: number;
      totalPaid: number;
      totalRemaining: number;
      globalAverage: string;
    },
    settings: SchoolSettings
  ): void {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = [15, 23, 42]; // Slate 900

    // En-tête Répubilque du Mali
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('RÉPUBLIQUE DU MALI', 15, 12);
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('Un Peuple - Un But - Une Foi', 15, 16);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('MINISTÈRE DE L\'ÉDUCATION NATIONALE', 200, 12);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(settings.academyName.toUpperCase(), 200, 16);
    doc.text(settings.capName.toUpperCase(), 200, 20);

    doc.setDrawColor(200, 200, 200);
    doc.line(15, 23, 282, 23);

    // Titre Rapport
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(15, 28, 267, 10, 2, 2, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(reportTitle.toUpperCase(), 148, 34.5, { align: 'center' });

    // Métadonnées & Filtres
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Établissement: ${settings.schoolName} | Année: ${settings.currentAcademicYear} | Édité le: ${new Date().toLocaleDateString('fr-FR')}`, 15, 44);
    doc.setFont('Helvetica', 'bold');
    doc.text(`Filtres Appliqués : ${filtersSummary}`, 15, 49);

    // Grid Synthese / Totaux
    doc.setFillColor(241, 245, 249);
    doc.rect(15, 53, 267, 10, 'F');
    doc.rect(15, 53, 267, 10);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Élèves: ${totals.studentCount}`, 20, 59.5);
    doc.text(`Moyenne Générale Globale: ${totals.globalAverage} / 20`, 80, 59.5);
    doc.text(`Total Encaissé: ${formatFCFA(totals.totalPaid)}`, 160, 59.5);
    doc.text(`Reste à Recouvrer: ${formatFCFA(totals.totalRemaining)}`, 220, 59.5);

    // Tableau de Données
    let y = 68;
    doc.setFillColor(226, 232, 240);
    doc.rect(15, y, 267, 7, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('N°', 18, y + 5);
    doc.text('MATRICULE', 28, y + 5);
    doc.text('NOM & PRÉNOM', 65, y + 5);
    doc.text('CLASSE', 125, y + 5);
    doc.text('MOYENNE', 160, y + 5);
    doc.text('PAYÉ (FCFA)', 190, y + 5);
    doc.text('RESTE (FCFA)', 225, y + 5);
    doc.text('STATUT', 260, y + 5);

    y += 7;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);

    rows.forEach((row, idx) => {
      // Nouvelle page si dépassement A4
      if (y > 180) {
        doc.addPage();
        y = 15;
        doc.setFillColor(226, 232, 240);
        doc.rect(15, y, 267, 7, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.text('N°', 18, y + 5);
        doc.text('MATRICULE', 28, y + 5);
        doc.text('NOM & PRÉNOM', 65, y + 5);
        doc.text('CLASSE', 125, y + 5);
        doc.text('MOYENNE', 160, y + 5);
        doc.text('PAYÉ (FCFA)', 190, y + 5);
        doc.text('RESTE (FCFA)', 225, y + 5);
        doc.text('STATUT', 260, y + 5);
        y += 7;
        doc.setFont('Helvetica', 'normal');
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 267, 6, 'F');
      }
      doc.rect(15, y, 267, 6);
      doc.text(String(idx + 1), 18, y + 4.5);
      doc.text(row.matricule, 28, y + 4.5);
      doc.text(row.studentName, 65, y + 4.5);
      doc.text(row.className, 125, y + 4.5);
      doc.text(row.average, 160, y + 4.5);
      doc.text(row.totalPaidFCFA, 190, y + 4.5);
      doc.text(row.remainingFCFA, 225, y + 4.5);
      doc.text(row.status, 260, y + 4.5);
      y += 6;
    });

    // Signature
    y += 12;
    if (y > 180) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('Helvetica', 'bold');
    doc.text('Le Chef d\'Établissement / Directeur Général', 200, y);
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(`Fait à ${settings.city}, le ` + new Date().toLocaleDateString('fr-FR'), 200, y + 5);

    doc.save(`Rapport_SomaSikolo_${new Date().toISOString().slice(0,10)}.pdf`);
  }

  /**
   * Internal helper to render an Invoice PDF on a jsPDF document page
   */
  public static async renderInvoiceOnDoc(
    doc: jsPDF,
    invoice: TuitionInvoice,
    studentPayments: Payment[],
    settings: SchoolSettings
  ): Promise<void> {
    // Primary Header & Mali Official Headings
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('RÉPUBLIQUE DU MALI', 15, 14);
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Un Peuple - Un But - Une Foi', 15, 18);

    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text((settings.academyName || 'Académie d\'Enseignement').toUpperCase(), 15, 24);
    doc.setFontSize(9);
    doc.text((settings.schoolName || 'Établissement Scolaire').toUpperCase(), 15, 29);

    // Title Box
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(75, 10, 60, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('FACTURE DE SCOLARITÉ', 105, 15.5, { align: 'center' });

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8);
    doc.text(`N° ${invoice.invoiceNumber}`, 105, 22, { align: 'center' });

    // Right Block
    doc.setTextColor(51, 65, 85);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${settings.city || 'Bamako'}, Mali`, 195, 14, { align: 'right' });
    doc.text(`Émise le: ${new Date(invoice.issueDate).toLocaleDateString('fr-FR')}`, 195, 19, { align: 'right' });
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(225, 29, 72); // Rose 600
    doc.text(`Échéance: ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}`, 195, 24, { align: 'right' });

    // Separator line
    doc.setLineWidth(0.8);
    doc.setDrawColor(15, 23, 42);
    doc.line(15, 33, 195, 33);

    // Student & Parent Metadata Card
    doc.setFillColor(248, 250, 252);
    doc.setLineWidth(0.3);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(15, 37, 180, 26, 1, 1, 'FD');

    // Left Details
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('DESTINATAIRE / ÉLÈVE :', 19, 43);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(invoice.studentName.toUpperCase(), 60, 43);

    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Matricule : ', 19, 49);
    doc.setFont('Helvetica', 'bold');
    doc.text(invoice.studentMatricule, 37, 49);

    doc.setFont('Helvetica', 'normal');
    doc.text('Classe : ', 80, 49);
    doc.setFont('Helvetica', 'bold');
    doc.text(invoice.className, 95, 49);

    doc.setFont('Helvetica', 'normal');
    doc.text('Année Scolaire : ', 135, 49);
    doc.setFont('Helvetica', 'bold');
    doc.text(invoice.academicYear, 160, 49);

    doc.setFont('Helvetica', 'normal');
    doc.text('Parent / Tuteur : ', 19, 56);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${invoice.parentName} (${invoice.parentPhone || 'Téléphone non renseigné'})`, 45, 56);

    // Financial Breakdown Table
    let y = 70;
    doc.setFillColor(30, 41, 59);
    doc.rect(15, y, 180, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('DESCRIPTION / MOTIF DE FACTURATION', 20, y + 5.5);
    doc.text('MONTANT EXIGIBLE', 185, y + 5.5, { align: 'right' });

    y += 8;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, y, 180, 10);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(invoice.description, 20, y + 6.5);
    doc.text(formatFCFA(invoice.totalAmount), 185, y + 6.5, { align: 'right' });

    // Versements déjà effectués
    y += 16;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('DÉTAIL DES VERSEMENTS DÉJÀ ENCAISSÉS :', 15, y);

    y += 4;
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, 180, 7, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text('N° Reçu', 18, y + 5);
    doc.text('Date', 50, y + 5);
    doc.text('Catégorie', 80, y + 5);
    doc.text('Mode Règlement', 120, y + 5);
    doc.text('Montant Versé', 185, y + 5, { align: 'right' });

    y += 7;
    if (studentPayments.length === 0) {
      doc.rect(15, y, 180, 7);
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Aucun versement enregistré à ce jour.', 20, y + 5);
      y += 7;
    } else {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      studentPayments.forEach((p, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 6, 'F');
        }
        doc.rect(15, y, 180, 6);
        doc.text(p.receiptNumber, 18, y + 4.5);
        doc.text(new Date(p.paymentDate).toLocaleDateString('fr-FR'), 50, y + 4.5);
        doc.text(p.category, 80, y + 4.5);
        doc.text(p.method, 120, y + 4.5);
        doc.setFont('Helvetica', 'bold');
        doc.text(formatFCFA(p.amountPaid), 185, y + 4.5, { align: 'right' });
        doc.setFont('Helvetica', 'normal');
        y += 6;
      });
    }

    // Totals Box
    y += 6;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(105, y, 90, 26, 1, 1, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Total Frais Exigibles :', 110, y + 6);
    doc.text(formatFCFA(invoice.totalAmount), 190, y + 6, { align: 'right' });

    doc.text('Total Déjà Encaissé :', 110, y + 12);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text(formatFCFA(invoice.paidAmount), 190, y + 12, { align: 'right' });

    doc.setLineWidth(0.4);
    doc.setDrawColor(203, 213, 225);
    doc.line(110, y + 15, 190, y + 15);

    doc.setFontSize(9);
    doc.setTextColor(225, 29, 72); // Rose
    doc.text('RESTE NET À PAYER :', 110, y + 21);
    doc.text(formatFCFA(invoice.remainingAmount), 190, y + 21, { align: 'right' });

    // Payment Methods Instructions
    doc.setFillColor(239, 246, 255); // Blue 50
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(15, y, 85, 26, 1, 1, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 58, 138); // Blue 900
    doc.text('MODALITÉS ET MOYENS DE RÈGLEMENT :', 18, y + 6);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text('• Guichet de la Caisse de l\'Établissement (Espèces)', 18, y + 11);
    doc.text('• Orange Money / Moov Money (Se rapprocher de la caisse)', 18, y + 16);
    doc.text(`• Échéance Impérative: ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}`, 18, y + 21);

    // QR Code Verification
    y += 32;
    try {
      const qrData = `FAC:${invoice.invoiceNumber}|MAT:${invoice.studentMatricule}|RESTE:${invoice.remainingAmount}FCFA|ECOLE:${settings.schoolName}`;
      const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 70 });
      doc.addImage(qrDataUrl, 'PNG', 15, y, 22, 22);
    } catch (e) {
      console.error(e);
    }

    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Scanner pour vérifier l\'authenticité de la facture.', 40, y + 8);
    doc.text(`Tél Service Comptabilité: ${settings.phone}`, 40, y + 13);

    // Signatures
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('LE GESTIONNAIRE COMPTABLE', 140, y + 5);
    doc.text('Sceau Officiel & Direction', 140, y + 18);
  }

  /**
   * Génère le PDF d'une facture de scolarité unique
   */
  public static async generateInvoicePdf(
    invoice: TuitionInvoice,
    studentPayments: Payment[],
    settings: SchoolSettings
  ): Promise<void> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    await this.renderInvoiceOnDoc(doc, invoice, studentPayments, settings);
    doc.save(`Facture_${invoice.invoiceNumber}_${invoice.studentMatricule}.pdf`);
  }

  /**
   * Génère un fichier PDF contenant toutes les factures de la classe
   */
  public static async generateClassInvoicesPdf(
    invoices: TuitionInvoice[],
    paymentsMap: Record<string, Payment[]>,
    settings: SchoolSettings,
    className: string
  ): Promise<void> {
    if (invoices.length === 0) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    for (let index = 0; index < invoices.length; index++) {
      if (index > 0) {
        doc.addPage();
      }
      const inv = invoices[index];
      const payments = paymentsMap[inv.studentId] || [];
      await this.renderInvoiceOnDoc(doc, inv, payments, settings);
    }

    const safeClassName = className.replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Factures_Scolarite_${safeClassName}.pdf`);
  }

  /**
   * Génère le Relevé Financier Individuel de l'Élève (Fiche d'historique des encaissements & solde)
   */
  public static async generateStudentStatementPdf(
    student: Student,
    studentClass: SchoolClass | undefined,
    studentPayments: Payment[],
    annualFee: number,
    settings: SchoolSettings
  ): Promise<void> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const totalPaid = studentPayments.reduce((acc, p) => acc + p.amountPaid, 0);
    const remaining = Math.max(0, annualFee - totalPaid);
    const className = studentClass?.name || 'Classe non assignée';
    const parentName = student.parent.fatherName || student.parent.motherName || 'Parent / Tuteur';
    const parentPhone = student.parent.fatherPhone || student.parent.motherPhone || settings.phone;

    // Header Republic & School
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('RÉPUBLIQUE DU MALI', 15, 14);
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Un Peuple - Un But - Une Foi', 15, 18);

    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text((settings.academyName || 'Académie d\'Enseignement').toUpperCase(), 15, 24);
    doc.setFontSize(9);
    doc.text((settings.schoolName || 'Établissement Scolaire').toUpperCase(), 15, 29);

    // Title Box
    doc.setFillColor(30, 41, 59);
    doc.rect(70, 10, 70, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('RELEVÉ FINANCIER ÉLÈVE', 105, 16.5, { align: 'center' });

    // Right Header
    doc.setTextColor(51, 65, 85);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${settings.city || 'Bamako'}, le ${new Date().toLocaleDateString('fr-FR')}`, 195, 14, { align: 'right' });
    doc.text(`Année Scolaire: ${settings.currentAcademicYear}`, 195, 19, { align: 'right' });

    // Line
    doc.setLineWidth(0.8);
    doc.setDrawColor(15, 23, 42);
    doc.line(15, 33, 195, 33);

    // Identity Card
    doc.setFillColor(248, 250, 252);
    doc.setLineWidth(0.3);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(15, 37, 180, 26, 1, 1, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('IDENTITÉ DE L\'ÉLÈVE :', 19, 43);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(`${student.lastName.toUpperCase()} ${student.firstName}`, 60, 43);

    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Matricule : ', 19, 49);
    doc.setFont('Helvetica', 'bold');
    doc.text(student.matricule, 37, 49);

    doc.setFont('Helvetica', 'normal');
    doc.text('Classe : ', 80, 49);
    doc.setFont('Helvetica', 'bold');
    doc.text(className, 95, 49);

    doc.setFont('Helvetica', 'normal');
    doc.text('Genre : ', 140, 49);
    doc.setFont('Helvetica', 'bold');
    doc.text(student.gender === 'M' ? 'Masculin' : 'Féminin', 153, 49);

    doc.setFont('Helvetica', 'normal');
    doc.text('Parent / Tuteur : ', 19, 56);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${parentName} (Tél: ${parentPhone})`, 45, 56);

    // Summary Financial KPIs Box
    let y = 68;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, y, 180, 16, 1, 1, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(15, y, 180, 16);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Frais Scolarité Annuelle', 25, y + 5);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(formatFCFA(annualFee), 25, y + 11);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Total Encaissements Effectués', 85, y + 5);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.setFontSize(9);
    doc.text(formatFCFA(totalPaid), 85, y + 11);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Solde Impayé Restant Dû', 145, y + 5);
    doc.setTextColor(225, 29, 72); // Rose
    doc.setFontSize(9);
    doc.text(formatFCFA(remaining), 145, y + 11);

    // Transactions Table
    y += 24;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`HISTORIQUE COMPLET DES TRANSACTIONS (${studentPayments.length}) :`, 15, y);

    y += 4;
    doc.setFillColor(30, 41, 59);
    doc.rect(15, y, 180, 7, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('N° Reçu', 18, y + 5);
    doc.text('Date', 50, y + 5);
    doc.text('Motif / Catégorie', 80, y + 5);
    doc.text('Mode de Règlement', 125, y + 5);
    doc.text('Montant Payé', 185, y + 5, { align: 'right' });

    y += 7;
    if (studentPayments.length === 0) {
      doc.rect(15, y, 180, 8);
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Aucune transaction enregistrée pour cet élève.', 20, y + 5.5);
      y += 8;
    } else {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      studentPayments.forEach((p, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 6, 'F');
        }
        doc.rect(15, y, 180, 6);
        doc.text(p.receiptNumber, 18, y + 4.5);
        doc.text(new Date(p.paymentDate).toLocaleDateString('fr-FR'), 50, y + 4.5);
        doc.text(`${p.category} ${p.monthCovered ? '(' + p.monthCovered + ')' : ''}`, 80, y + 4.5);
        doc.text(p.method, 125, y + 4.5);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text(formatFCFA(p.amountPaid), 185, y + 4.5, { align: 'right' });
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        y += 6;
      });
    }

    // QR Code & Signatures
    y += 12;
    try {
      const qrData = `ELEVE:${student.matricule}|PAIE:${totalPaid}FCFA|RESTE:${remaining}FCFA|ECOLE:${settings.schoolName}`;
      const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 70 });
      doc.addImage(qrDataUrl, 'PNG', 15, y, 22, 22);
    } catch (e) {
      console.error(e);
    }

    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Le présent relevé fait foi pour le règlement des droits de scolarité.', 40, y + 8);
    doc.text(`Direction / Caisse: ${settings.phone}`, 40, y + 13);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('LE GESTIONNAIRE FINANCIER', 140, y + 5);
    doc.text('Cachet Officiel Établissement', 140, y + 18);

    doc.save(`Releve_Financier_${student.matricule}_${student.lastName}.pdf`);
  }

  /**
   * Generates official Attendance Report PDF (Rapport d'Assiduité et Registre des Présences)
   */
  public static generateAttendanceReportPdf(
    className: string,
    dateOrPeriod: string,
    records: AttendanceRecord[],
    classStudents: Student[],
    settings: SchoolSettings
  ): void {
    const doc = new jsPDF('p', 'mm', 'a4');

    // Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('RÉPUBLIQUE DU MALI', 15, 14);
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Un Peuple - Un But - Une Foi', 15, 18);

    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text((settings.academyName || 'Académie d\'Enseignement').toUpperCase(), 15, 24);
    doc.setFontSize(9);
    doc.text((settings.schoolName || 'Établissement Scolaire').toUpperCase(), 15, 29);

    // Title Pill
    doc.setFillColor(15, 23, 42);
    doc.rect(75, 10, 60, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('RAPPORT D\'ASSIDUITÉ', 105, 15.5, { align: 'center' });

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Classe: ${className} | ${dateOrPeriod}`, 105, 23, { align: 'center' });

    // Right Block
    doc.setTextColor(51, 65, 85);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${settings.city || 'Bamako'}, le ${new Date().toLocaleDateString('fr-FR')}`, 195, 14, { align: 'right' });
    doc.text(`Année: ${settings.currentAcademicYear || '2025-2026'}`, 195, 19, { align: 'right' });

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(15, 33, 195, 33);

    // Summary Box
    const totalEnrolled = classStudents.length;
    const presents = records.filter(r => r.status === 'PRESENT').length;
    const lates = records.filter(r => r.status === 'LATE').length;
    const absUnjustified = records.filter(r => r.status === 'ABSENT_UNJUSTIFIED').length;
    const absJustified = records.filter(r => r.status === 'ABSENT_JUSTIFIED').length;
    const rate = totalEnrolled > 0 ? Math.round(((presents + lates) / totalEnrolled) * 100) : 100;

    doc.setFillColor(248, 250, 252);
    doc.rect(15, 36, 180, 16, 'F');
    doc.rect(15, 36, 180, 16);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    doc.text(`EFFECTIF TOTAL: ${totalEnrolled}`, 20, 43);
    doc.setTextColor(16, 185, 129);
    doc.text(`PRÉSENTS: ${presents}`, 65, 43);
    doc.setTextColor(245, 158, 11);
    doc.text(`RETARDS: ${lates}`, 105, 43);
    doc.setTextColor(225, 29, 72);
    doc.text(`ABSENTS NON JUSTIF.: ${absUnjustified}`, 145, 43);

    doc.setTextColor(79, 70, 229);
    doc.text(`ABSENTS JUSTIFIÉS: ${absJustified}`, 20, 48.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`TAUX D'ASSIDUITÉ DE LA CLASSE: ${rate}%`, 105, 48.5);

    // Table Header
    let y = 58;
    doc.setFillColor(15, 23, 42);
    doc.rect(15, y, 180, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);

    doc.text('N°', 18, y + 4.8);
    doc.text('MATRICULE', 26, y + 4.8);
    doc.text('NOM & PRÉNOMS ÉLÈVE', 60, y + 4.8);
    doc.text('STATUT D\'ASSIDUITÉ', 125, y + 4.8);
    doc.text('MOTIF / REMARQUE', 160, y + 4.8);

    y += 7;

    classStudents.forEach((student, index) => {
      const rec = records.find(r => r.studentId === student.id);
      const statusStr = !rec ? 'NON MARQUÉ' :
        rec.status === 'PRESENT' ? 'PRÉSENT' :
        rec.status === 'LATE' ? `EN RETARD (${rec.lateMinutes || 15} min)` :
        rec.status === 'ABSENT_JUSTIFIED' ? 'ABSENT JUSTIFIÉ' : 'ABSENT NON JUSTIFIÉ';

      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 180, 6, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(15, y, 180, 6);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);

      doc.text(String(index + 1), 18, y + 4.2);
      doc.text(student.matricule, 26, y + 4.2);
      doc.setFont('Helvetica', 'bold');
      doc.text(`${student.lastName.toUpperCase()} ${student.firstName}`, 60, y + 4.2);

      doc.setFont('Helvetica', 'bold');
      if (!rec || rec.status === 'PRESENT') {
        doc.setTextColor(16, 185, 129);
      } else if (rec.status === 'LATE') {
        doc.setTextColor(217, 119, 6);
      } else if (rec.status === 'ABSENT_JUSTIFIED') {
        doc.setTextColor(79, 70, 229);
      } else {
        doc.setTextColor(225, 29, 72);
      }
      doc.text(statusStr, 125, y + 4.2);

      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(rec?.reason || '-', 160, y + 4.2);

      y += 6;

      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    // Signatures
    y += 12;
    if (y > 255) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('LE SURVEILLANT GÉNÉRAL / PROFESSEUR TITULAIRE', 20, y);
    doc.text('LE DIRECTEUR D\'ÉTABLISSEMENT', 130, y);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Signature et observations:', 20, y + 5);
    doc.text('Signature et cachet officiel:', 130, y + 5);

    doc.save(`Rapport_Assiduite_${className.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  }
}
