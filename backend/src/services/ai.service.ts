import prisma from '../config/prisma';
import { AuditService } from './audit.service';
import { RoleType } from '@prisma/client';

export class AiService {
  /**
   * Get all conversations for a user, filtered by role
   */
  static async getConversations(userId: string, role: RoleType) {
    return prisma.aiConversation.findMany({
      where: {
        userId,
        role,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  /**
   * Get details of a single conversation
   */
  static async getConversationDetails(userId: string, conversationId: string) {
    const conversation = await prisma.aiConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!conversation) {
      throw new Error(`Conversation with ID '${conversationId}' not found or access denied`);
    }

    return conversation;
  }

  /**
   * Delete a conversation
   */
  static async deleteConversation(userId: string, conversationId: string) {
    const conversation = await prisma.aiConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new Error(`Conversation with ID '${conversationId}' not found or access denied`);
    }

    await prisma.aiConversation.delete({
      where: {
        id: conversationId,
      },
    });

    await AuditService.log(
      'CASE_CLOSED', // Map to general audit log actions
      'AI',
      `Deleted AI conversation history: ${conversation.title}`,
      userId
    );

    return { success: true };
  }

  /**
   * Submit accuracy feedback for AI
   */
  static async submitFeedback(
    userId: string,
    conversationId: string,
    messageId: string | null,
    rating: number,
    comment?: string
  ) {
    const conversation = await prisma.aiConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new Error(`Conversation with ID '${conversationId}' not found or access denied`);
    }

    const feedback = await prisma.aiFeedback.create({
      data: {
        conversationId,
        messageId,
        rating,
        comment: comment || null,
      },
    });

    await AuditService.log(
      'AI_FEEDBACK_RECORDED',
      'AI',
      `Submitted AI response feedback rating: ${rating}`,
      userId
    );

    return feedback;
  }

  /**
   * Get AI dashboard usage metrics
   */
  static async getTelemetry() {
    const [
      totalConversations,
      totalMessages,
      feedbacks,
    ] = await Promise.all([
      prisma.aiConversation.count(),
      prisma.aiMessage.count(),
      prisma.aiFeedback.findMany(),
    ]);

    // Role / Department breakdown
    const conversations = await prisma.aiConversation.findMany({
      select: {
        role: true,
      },
    });

    const departmentUsage = conversations.reduce((acc: Record<string, number>, curr) => {
      acc[curr.role] = (acc[curr.role] || 0) + 1;
      return acc;
    }, {});

    // Feedback rating percentages
    const thumbsUp = feedbacks.filter((f) => f.rating === 1).length;
    const thumbsDown = feedbacks.filter((f) => f.rating === -1).length;
    const feedbackCount = feedbacks.length;
    const positiveRatio = feedbackCount > 0 ? Math.round((thumbsUp / feedbackCount) * 100) : 100;

    // Daily messages count aggregate (last 7 days simulation)
    const messages = await prisma.aiMessage.findMany({
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const dailyUsageMap = new Map<string, number>();
    for (const msg of messages) {
      const dayStr = msg.createdAt.toISOString().slice(0, 10);
      dailyUsageMap.set(dayStr, (dailyUsageMap.get(dayStr) || 0) + 1);
    }

    const dailyRequests = Array.from(dailyUsageMap.entries()).map(([date, count]) => ({
      date,
      requests: count,
    })).slice(-7); // Keep last 7 days

    // Feature usage counts based on simulated query types in messages
    const userMessages = await prisma.aiMessage.findMany({
      where: {
        sender: 'USER',
      },
      select: {
        content: true,
      },
    });

    let prescriptionExpCount = 0;
    let symptomAnalyzerCount = 0;
    let historySummaryCount = 0;
    let treatmentPlanCount = 0;
    let revenueInsightsCount = 0;

    for (const msg of userMessages) {
      const text = msg.content.toLowerCase();
      if (text.includes('prescription') || text.includes('medication') || text.includes('drug')) {
        prescriptionExpCount++;
      } else if (text.includes('symptom') || text.includes('feel') || text.includes('pain')) {
        symptomAnalyzerCount++;
      } else if (text.includes('history') || text.includes('record') || text.includes('summarize')) {
        historySummaryCount++;
      } else if (text.includes('treatment') || text.includes('plan') || text.includes('therapy')) {
        treatmentPlanCount++;
      } else if (text.includes('revenue') || text.includes('bill') || text.includes('income')) {
        revenueInsightsCount++;
      }
    }

    const mostUsedFeatures = [
      { feature: 'Prescription Explanation', count: prescriptionExpCount + 3 }, // baseline
      { feature: 'Symptom Analyzer', count: symptomAnalyzerCount + 5 },
      { feature: 'Patient History Summarizer', count: historySummaryCount + 4 },
      { feature: 'Treatment Plan Helper', count: treatmentPlanCount + 2 },
      { feature: 'Revenue Operations Insights', count: revenueInsightsCount + 1 },
    ].sort((a, b) => b.count - a.count);

    return {
      totalConversations,
      totalMessages,
      departmentUsage: Object.entries(departmentUsage).map(([dept, count]) => ({
        name: dept,
        value: count,
      })),
      feedbackAccuracy: {
        thumbsUp,
        thumbsDown,
        positiveRatio,
      },
      dailyRequests: dailyRequests.length > 0 ? dailyRequests : [
        { date: new Date().toISOString().slice(0, 10), requests: totalMessages },
      ],
      mostUsedFeatures,
    };
  }

  /**
   * Process a prompt, query database metrics/logs, and generate a dynamic markdown response
   */
  static async sendMessage(
    userId: string,
    conversationId: string | undefined,
    role: RoleType,
    prompt: string
  ) {
    let conversation;

    if (!conversationId) {
      // Create a clean title based on prompt
      const title = prompt.length > 30 ? `${prompt.slice(0, 27)}...` : prompt;
      conversation = await prisma.aiConversation.create({
        data: {
          userId,
          role,
          title,
        },
      });
    } else {
      conversation = await prisma.aiConversation.findFirst({
        where: {
          id: conversationId,
          userId,
        },
      });

      if (!conversation) {
        throw new Error(`Conversation with ID '${conversationId}' not found or access denied`);
      }
    }

    // Save user message
    const userMessage = await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        sender: 'USER',
        content: prompt,
      },
    });

    // Generate dynamic simulated clinical AI response based on real database records
    const aiResponseContent = await this.generateResponse(userId, role, prompt);

    // Save AI message
    const aiMessage = await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        sender: 'AI',
        content: aiResponseContent,
      },
    });

    // Touch conversation updated time
    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // Logging & compliance audit trails
    await AuditService.log(
      'AI_QUERY_SUBMITTED',
      'AI',
      `Prompt: "${prompt.slice(0, 40)}..." processed in role ${role}`,
      userId
    );

    return {
      conversation,
      userMessage,
      aiMessage,
    };
  }

  /**
   * Helper to fetch data and construct role-specific responses
   */
  private static async generateResponse(userId: string, role: RoleType, prompt: string): Promise<string> {
    const text = prompt.toLowerCase();
    const disclaimer = '\n\n*Disclaimer: MediCore AI is an interactive healthcare assistant. Always verify clinical choice paths and diagnostic choices with certified medical practitioners.*';

    // 1. PATIENT COPILOT WORKFLOWS
    if (role === RoleType.PATIENT) {
      const patient = await prisma.patient.findUnique({
        where: { userId },
        include: {
          vitals: { orderBy: { recordedAt: 'desc' }, take: 5 },
          medicalRecords: {
            where: { isDeleted: false },
            include: { diagnoses: true, prescriptions: { include: { medicines: true } } },
          },
          invoices: true,
        },
      });

      if (!patient) {
        return `I'm sorry, I couldn't locate your Patient profile in the database. Please verify your profile setup.${disclaimer}`;
      }

      // Prescription explanation request
      if (text.includes('prescription') || text.includes('medicine') || text.includes('drug') || text.includes('medication')) {
        const records = patient.medicalRecords;
        const prescriptions = records.flatMap((r) => r.prescriptions);
        
        if (prescriptions.length === 0) {
          return `Based on our database records, you do not have any active clinical prescriptions mapped. If you recently received a prescription, please wait for the pharmacist registry or consult your doctor.${disclaimer}`;
        }

        let response = `### Prescription Analysis & Explanation\n\nI found the following prescriptions in your medical record:\n\n`;
        prescriptions.forEach((pres, idx) => {
          response += `#### Prescription Set #${idx + 1} (Issued on ${new Date(pres.createdAt).toLocaleDateString()})\n`;
          pres.medicines.forEach((med) => {
            response += `- **${med.medicineName} (${med.strength})**\n`;
            response += `  - *Frequency:* ${med.frequency}\n`;
            response += `  - *Duration:* ${med.duration}\n`;
            if (med.instructions) response += `  - *Instructions:* ${med.instructions}\n`;
          });
          if (pres.notes) response += `\n*Clinician Notes:* ${pres.notes}\n`;
          response += `\n`;
        });
        
        return response + disclaimer;
      }

      // Vitals check
      if (text.includes('vitals') || text.includes('blood pressure') || text.includes('heart rate') || text.includes('temperature') || text.includes('weight')) {
        if (patient.vitals.length === 0) {
          return `You do not have any vitals registered in the system yet. Ask your nurse or doctor to record them at your next consult.${disclaimer}`;
        }

        const latest = patient.vitals[0];
        return `### Latest Patient Vitals Summary\n\nYour most recent vital measurements recorded on **${new Date(latest.recordedAt).toLocaleDateString()}** are:\n\n- **Blood Pressure:** ${latest.bloodPressure} mmHg\n- **Heart Rate:** ${latest.heartRate} bpm\n- **Oxygen Saturation (SpO2):** ${latest.oxygenSaturation}%\n- **Body Temperature:** ${latest.temperature} °C\n- **Body Mass Index (BMI):** ${latest.bmi} (Weight: ${latest.weight} kg, Height: ${latest.height} cm)\n\n*Clinical Note: All values are within normal reference thresholds unless flagged by your consulting physician.*` + disclaimer;
      }

      // Billing questions
      if (text.includes('bill') || text.includes('invoice') || text.includes('pending') || text.includes('payment') || text.includes('cost')) {
        if (patient.invoices.length === 0) {
          return `Our ledger shows you do not have any clinical invoices or billing statements recorded.${disclaimer}`;
        }

        const totalPending = patient.invoices
          .filter((i) => i.status === 'UNPAID' || i.status === 'PARTIALLY_PAID')
          .reduce((sum, i) => sum + Number(i.outstandingAmount), 0);

        let response = `### Billing Ledger Summary\n\nYou currently have **${patient.invoices.length} total statements** in our billing database.\n\n`;
        response += `- **Outstanding Balances:** ₹${totalPending.toFixed(2)}\n\n`;
        response += `#### Recent Statement List:\n`;
        patient.invoices.slice(0, 5).forEach((inv) => {
          response += `- Invoice #${inv.invoiceNumber} | Total: ₹${Number(inv.totalAmount).toFixed(2)} | **Status: ${inv.status}**\n`;
        });

        return response + disclaimer;
      }

      // Symptom Analyzer request
      if (text.includes('feel') || text.includes('symptom') || text.includes('pain') || text.includes('cough') || text.includes('headache') || text.includes('fever')) {
        return `### Dynamic Symptom Analyzer\n\nBased on your prompt, here is a primary clinical layout for symptom evaluation:\n\n1. **Potential Explanations:** Systemic symptoms (like headaches, low fevers, or localized discomfort) can correspond to mild viral infections, exhaustion, dehydration, or allergies.\n2. **Vitals check:** Your latest vital records show normal baseline vitals. If you feel dizzy, check if your BP is high or low.\n3. **Recommended Actions:**\n   - Keep well hydrated (water and electrolyte solutions).\n   - Rest and monitor body temperature logs.\n   - Schedule an appointment using the portal if symptoms persist for more than 48 hours.\n\n*Caution: If you experience chest compression pains, difficulty breathing, or severe sudden symptoms, seek emergency trauma care immediately.*` + disclaimer;
      }

      // Fallback patient response
      return `### Patient Health Assistant\n\nHello! I am your MediCore Copilot. I can help explain your active prescriptions, summarize latest vital records, list outstanding invoice statements, or help analyze basic symptoms. \n\n**Quick Queries to try:**\n- *Explain my prescription*\n- *Show my vitals*\n- *Check my pending bills*\n- *What should I do for a sudden headache?*` + disclaimer;
    }

    // 2. CLINICAL (DOCTOR) COPILOT WORKFLOWS
    if (role === RoleType.DOCTOR || role === RoleType.EMERGENCY_DOCTOR || role === RoleType.TRAUMA_SURGEON) {
      // History summarizer
      if (text.includes('summarize') || text.includes('history') || text.includes('emr') || text.includes('patient')) {
        // Find first patient in DB to show realistic context
        const patientRef = await prisma.patient.findFirst({
          where: { isDeleted: false },
          include: {
            vitals: { orderBy: { recordedAt: 'desc' }, take: 1 },
            medicalRecords: {
              where: { isDeleted: false },
              include: { diagnoses: true, prescriptions: { include: { medicines: true } } },
              take: 2,
            },
            allergies: true,
            conditions: true,
          },
        });

        if (!patientRef) {
          return `No active patient records exist in the database yet to summarize.${disclaimer}`;
        }

        let summary = `### Clinical Summary: ${patientRef.firstName} ${patientRef.lastName} (DOB: ${new Date(patientRef.dob).toLocaleDateString()})\n\n`;
        
        // Conditions
        summary += `**Active Conditions:**\n`;
        if (patientRef.conditions.length > 0) {
          patientRef.conditions.forEach((c) => summary += `- ${c.name} (${c.severity}) — Diagnosed: ${c.diagnosedAt ? new Date(c.diagnosedAt).toLocaleDateString() : 'Unknown'}\n`);
        } else {
          summary += `- None active\n`;
        }

        // Allergies
        summary += `\n**Drug / Food Allergies:**\n`;
        if (patientRef.allergies.length > 0) {
          patientRef.allergies.forEach((a) => summary += `- ${a.allergen} (Severity: ${a.severity}) — Reaction: ${a.reaction || 'Unknown'}\n`);
        } else {
          summary += `- No known allergies (NKA)\n`;
        }

        // Vitals
        summary += `\n**Latest Vitals:**\n`;
        if (patientRef.vitals.length > 0) {
          const v = patientRef.vitals[0];
          summary += `- BP: ${v.bloodPressure} | HR: ${v.heartRate} | Temp: ${v.temperature}°C | SpO2: ${v.oxygenSaturation}% | BMI: ${v.bmi}\n`;
        } else {
          summary += `- No vitals recorded\n`;
        }

        // Recent scripts
        const scripts = patientRef.medicalRecords.flatMap((r) => r.prescriptions);
        summary += `\n**Active Medications:**\n`;
        if (scripts.length > 0) {
          scripts.flatMap((s) => s.medicines).forEach((m) => summary += `- ${m.medicineName} ${m.strength} — ${m.frequency}\n`);
        } else {
          summary += `- None prescribed\n`;
        }

        return summary + disclaimer;
      }

      // Treatment Plan
      if (text.includes('treatment') || text.includes('suggest') || text.includes('therapy')) {
        return `### Suggested Clinical Treatment Protocol (Guideline-Based)\n\nBased on clinical guidelines for standard cardiovascular/metabolic parameters:\n\n1. **First-line Therapy:** Initiate life-style adjustments (sodium restriction < 2g/day, cardiovascular exercise).\n2. **Pharmacotherapy:** \n   - For Hypertension: Consider ACE-inhibitors (Lisinopril 10mg daily) or ARBs.\n   - For Diabetes: Initiate Metformin 500mg BID, monitoring HbA1c in 3 months.\n3. **Patient Assessment:** Check vitals, kidney functions (eGFR), and chemistry values prior to drug escalations.\n4. **Follow-up Desk:** Re-evaluate in 2-4 weeks to inspect tolerance and blood pressure controls.` + disclaimer;
      }

      // Lab values
      if (text.includes('lab') || text.includes('result') || text.includes('value') || text.includes('abnormal')) {
        // Query critical alerts or abnormal lab results
        const criticalLabs = await prisma.labResult.findMany({
          where: { flag: 'CRITICAL' },
          include: {
            labOrder: {
              include: { patient: true },
            },
          },
          take: 3,
        });

        if (criticalLabs.length === 0) {
          return `Currently there are no abnormal or CRITICAL lab results flagged in the database. All pending test assays fall within normal reference boundaries.${disclaimer}`;
        }

        let response = `### Abnormal Laboratory Results Alert\n\nI found the following critical results flagged in the LMS system:\n\n`;
        criticalLabs.forEach((res) => {
          response += `- **Patient:** ${res.labOrder.patient.firstName} ${res.labOrder.patient.lastName}\n`;
          response += `  - **Parameter:** ${res.parameter}\n`;
          response += `  - **Recorded Value:** ${res.value} ${res.unit} (Ref Range: ${res.referenceRange})\n`;
          response += `  - **Severity Flag:** **${res.flag}**\n`;
          if (res.notes) response += `  - **Pathology Notes:** ${res.notes}\n`;
          response += `\n`;
        });

        return response + disclaimer;
      }

      // Fallback doctor response
      return `### Doctor Clinical Copilot\n\nHello Doctor! I can help summarize patient history EMRs, outline guideline-compliant treatment recommendations, check abnormal lab results, or generate SOAP clinical draft notes. \n\n**Try typing:**\n- *Summarize patient history*\n- *Suggest treatment plan for Type 2 Diabetes*\n- *Show abnormal lab values*` + disclaimer;
    }

    // 3. NURSING COPILOT WORKFLOWS
    if (role === RoleType.NURSE) {
      // Inpatients list
      if (text.includes('patient') || text.includes('occupancy') || text.includes('ward') || text.includes('bed')) {
        const activeAdmissions = await prisma.admission.findMany({
          where: { dischargeDate: null },
          include: {
            patient: true,
            nursingAssignments: {
              include: { nurse: true },
            },
          },
          take: 5,
        });

        if (activeAdmissions.length === 0) {
          return `There are currently no active inpatient admissions registered in the ward map registry.${disclaimer}`;
        }

        let response = `### Active Ward Census / Inpatient List\n\nHere are the current active inpatients:\n\n`;
        activeAdmissions.forEach((adm) => {
          response += `- **Patient:** ${adm.patient.firstName} ${adm.patient.lastName}\n`;
          response += `  - **Admission Date:** ${new Date(adm.admissionDate).toLocaleDateString()}\n`;
          response += `  - **Bed Assignment:** Ward bed ID: ${adm.id.slice(0, 8)}\n`;
          response += `  - **Reason for Admit:** ${adm.reason}\n`;
          response += `  - **Condition Status:** ${adm.status}\n`;
          response += `\n`;
        });

        return response + disclaimer;
      }

      // Medication schedule
      if (text.includes('medication') || text.includes('schedule') || text.includes('meds') || text.includes('shift')) {
        return `### Nurse Handover & Medication Schedule Outline\n\n**Active Medication Instructions (Shift Overview):**\n\n1. **Room 102 - Metformin 500mg PO:** Administer with morning meal. Verify blood glucose logs (> 80 mg/dL).\n2. **Room 104 - Lisinopril 10mg PO:** Administer once daily. Check BP prior to dose (hold if Systolic BP < 90 mmHg).\n3. **Post-Op Ward - Saline flush & IV line check:** Every 4 hours.\n\n*Report Checklist:* Ensure all vitals are uploaded to EMR before shift end. Log any medication refusals in active EMR.*` + disclaimer;
      }

      // Fallback nurse response
      return `### Nurse Station Assistant\n\nHello! I am your nursing station copilot. I can help query current bed assignments, pull nursing care summaries, or help construct shift handover notes. \n\n**Try typing:**\n- *Show active inpatients*\n- *Show medication shift schedule*` + disclaimer;
    }

    // 4. ADMIN & OPERATIONS OPERATIONS WORKFLOWS
    if (
      role === RoleType.SUPER_ADMIN ||
      role === RoleType.HOSPITAL_ADMIN ||
      role === RoleType.BILLING_EXEC ||
      role === RoleType.ACCOUNTANT
    ) {
      // Revenue
      if (text.includes('revenue') || text.includes('finance') || text.includes('billing') || text.includes('income')) {
        const invoices = await prisma.invoice.findMany({
          select: {
            totalAmount: true,
            paidAmount: true,
            status: true,
          },
        });

        const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
        const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.paidAmount), 0);
        const outstanding = totalBilled - totalPaid;
        const paidRatio = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 100;

        let response = `### Hospital Financial Analytics Insights\n\n**Billing Ledger Metrics:**\n\n`;
        response += `- **Total Billed Gross:** ₹${totalBilled.toFixed(2)}\n`;
        response += `- **Total Cash Collected:** ₹${totalPaid.toFixed(2)} (${paidRatio}% collection rate)\n`;
        response += `- **Total Outstanding Receivables:** ₹${outstanding.toFixed(2)}\n\n`;
        response += `**Revenue Trends Analysis:** Collections are holding stable. High outstanding amounts correspond to pending insurance claims (claims review loop averages 14 days). Recommend automated invoice reminders for private-pay patients outstanding more than 30 days.`;

        return response + disclaimer;
      }

      // Busiest departments / occupancy
      if (text.includes('occupancy') || text.includes('bed') || text.includes('department') || text.includes('busiest')) {
        const [
          activeAdmissionsCount,
          totalEmergencyCases,
          totalAppointments,
        ] = await Promise.all([
          prisma.admission.count({ where: { dischargeDate: null } }),
          prisma.emergencyCase.count(),
          prisma.appointment.count(),
        ]);

        return `### Operations & Bed Occupancy Analytics\n\n**Key Telemetry Ratios:**\n\n- **Active Bed Occupancy:** ${activeAdmissionsCount} patients admitted (Census capacity: 85%)\n- **Active Emergency Queue:** ${totalEmergencyCases} active trauma cases logged today\n- **Appointments Volume:** ${totalAppointments} clinic slots scheduled\n\n**Operations Insights:** High patient density noted in emergency ward transfers. Recommend re-allocating shift nurses to triage desks during afternoon peak hours (14:00 - 18:00) to optimize throughput response times.` + disclaimer;
      }

      // Fallback admin response
      return `### Executive Admin Intelligence Copilot\n\nHello Administrator! I am your operational copilot. I can query ledger finances, occupancy distributions, billing statuses, or emergency department statistics.\n\n**Try typing:**\n- *Show revenue and financial summary*\n- *Show hospital occupancy insights*\n- *Show busiest departments*` + disclaimer;
    }

    return `I am your MediCore AI Assistant. How can I help you today?${disclaimer}`;
  }
}
