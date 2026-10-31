import 'package:flutter/material.dart';

import '../database_helper.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';
import 'patients_screen.dart';

class AddRecordScreen extends StatefulWidget {
  const AddRecordScreen({super.key, required this.patient});

  final Patient patient;

  @override
  State<AddRecordScreen> createState() => _AddRecordScreenState();
}

class _AddRecordScreenState extends State<AddRecordScreen> {
  static const _vaccines = ['Measles-Rubella (MR)', 'Polio (OPV)', 'DPT Booster'];

  String _selectedVaccine = _vaccines.first;
  bool _saving = false;

  Future<void> _saveOfflineEvent() async {
    setState(() => _saving = true);

    final recordData = {
      'vaccine': _selectedVaccine,
      'patient': widget.patient.name,
      'administered_by': 'worker_jalandhar_01',
      'timestamp': DateTime.now().toIso8601String(),
    };

    try {
      await DatabaseHelper.instance.insertEvent(
        eventType: 'vaccination',
        payload: recordData,
      );

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Event saved locally! Ready for background sync.'),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.pop(context);
    } catch (_) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not save the event. Please try again.'),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final narrow = MediaQuery.of(context).size.width < 600;

    return Scaffold(
      appBar: AppBar(title: const Text('Log clinical event')),
      body: SingleChildScrollView(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: Padding(
              padding: EdgeInsets.all(narrow ? 16 : 24),
              child: AppCard(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Record new vaccination',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Patient: ${widget.patient.name}',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'This data will be securely saved to the local SQLite log and uploaded when a connection is found.',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'Vaccine type',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: _selectedVaccine,
                      isExpanded: true,
                      items: _vaccines
                          .map((v) => DropdownMenuItem<String>(
                                value: v,
                                child: Text(v),
                              ))
                          .toList(),
                      onChanged: _saving
                          ? null
                          : (newValue) {
                              if (newValue == null) return;
                              setState(() => _selectedVaccine = newValue);
                            },
                    ),
                    const SizedBox(height: 32),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed:
                                _saving ? null : () => Navigator.pop(context),
                            child: const Text('Cancel'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: FilledButton.icon(
                            onPressed: _saving ? null : _saveOfflineEvent,
                            icon: _saving
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(Icons.save_alt, size: 18),
                            label: const Text('Save offline event'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
