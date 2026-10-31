import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../widgets/common.dart';

class Patient {
  const Patient({
    required this.id,
    required this.name,
    required this.lastSynced,
  });

  final String id;
  final String name;
  final String lastSynced;
}

// Same placeholder roster the app already used.
const samplePatients = [
  Patient(id: '001', name: 'Student/Patient 001', lastSynced: '2 days ago'),
  Patient(id: '002', name: 'Student/Patient 002', lastSynced: '2 days ago'),
  Patient(id: '003', name: 'Student/Patient 003', lastSynced: '2 days ago'),
];

class PatientsScreen extends StatelessWidget {
  const PatientsScreen({
    super.key,
    required this.query,
    required this.onSelectPatient,
  });

  final String query;
  final ValueChanged<Patient> onSelectPatient;

  @override
  Widget build(BuildContext context) {
    final q = query.trim().toLowerCase();
    final patients = q.isEmpty
        ? samplePatients
        : samplePatients
            .where((p) =>
                p.name.toLowerCase().contains(q) || p.id.contains(q))
            .toList();

    return PageScaffold(
      children: [
        const PageHeader(
          title: 'Patient roster',
          subtitle: 'Select a patient to log a clinical event.',
        ),
        const SizedBox(height: 20),
        if (patients.isEmpty)
          const EmptyState(
            icon: Icons.search_off,
            title: 'No matching patients',
            message: 'Try a different name or ID.',
          )
        else ...[
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              '${patients.length} of ${samplePatients.length} patients',
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                for (var i = 0; i < patients.length; i++) ...[
                  if (i > 0) const Divider(height: 1),
                  _PatientRow(
                    patient: patients[i],
                    onTap: () => onSelectPatient(patients[i]),
                  ),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _PatientRow extends StatelessWidget {
  const _PatientRow({required this.patient, required this.onTap});

  final Patient patient;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: const BoxDecoration(
                color: AppColors.softBlue,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.person_outline,
                size: 20,
                color: AppColors.navySecondary,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    patient.name,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Last synced: ${patient.lastSynced}',
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const Text(
              'Log event',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.accent,
              ),
            ),
            const SizedBox(width: 4),
            const Icon(
              Icons.chevron_right,
              size: 20,
              color: AppColors.textSecondary,
            ),
          ],
        ),
      ),
    );
  }
}