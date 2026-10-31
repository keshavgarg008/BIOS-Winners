import 'dart:convert';

import 'package:flutter/material.dart';

import '../database_helper.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';

/// Lists events stored on this device and whether they have been uploaded.
class SyncQueueScreen extends StatefulWidget {
  const SyncQueueScreen({super.key});

  @override
  State<SyncQueueScreen> createState() => _SyncQueueScreenState();
}

class _SyncQueueScreenState extends State<SyncQueueScreen> {
  late Future<List<Map<String, Object?>>> _future;

  @override
  void initState() {
    super.initState();
    _future = DatabaseHelper.instance.getEvents();
    DatabaseHelper.instance.revision.addListener(_reload);
  }

  @override
  void dispose() {
    DatabaseHelper.instance.revision.removeListener(_reload);
    super.dispose();
  }

  void _reload() {
    if (!mounted) return;
    setState(() {
      _future = DatabaseHelper.instance.getEvents();
    });
  }

  /// The payload is stored either as JSON or as a Dart Map.toString()
  /// ("{vaccine: X, patient: Y}"). Read both.
  Map<String, String> _parsePayload(String raw) {
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map) {
        return decoded.map((k, v) => MapEntry('$k', '$v'));
      }
    } catch (_) {}
    final result = <String, String>{};
    var body = raw.trim();
    if (body.startsWith('{') && body.endsWith('}')) {
      body = body.substring(1, body.length - 1);
    }
    for (final part in body.split(', ')) {
      final i = part.indexOf(': ');
      if (i > 0) result[part.substring(0, i)] = part.substring(i + 2);
    }
    return result;
  }

  void _syncNow() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Searching for network to sync events...')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PageScaffold(
      children: [
        PageHeader(
          title: 'Sync queue',
          subtitle: 'Events saved on this device and their upload status.',
          action: FilledButton.icon(
            onPressed: _syncNow,
            icon: const Icon(Icons.sync, size: 18),
            label: const Text('Sync queued events'),
          ),
        ),
        const SizedBox(height: 20),
        FutureBuilder<List<Map<String, Object?>>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: Center(child: CircularProgressIndicator()),
              );
            }
            if (snapshot.hasError) {
              return ErrorState(
                message: 'The local queue could not be read.',
                onRetry: _reload,
              );
            }
            final events = snapshot.data ?? const [];
            if (events.isEmpty) {
              return const EmptyState(
                icon: Icons.inbox_outlined,
                title: 'No events yet',
                message:
                    'Events you log appear here until they are uploaded.',
              );
            }
            final pending =
                events.where((e) => (e['sync_status'] as int? ?? 0) == 0).length;
            final synced = events.length - pending;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(child: _Stat(label: 'Pending', value: pending)),
                    const SizedBox(width: 12),
                    Expanded(child: _Stat(label: 'Synced', value: synced)),
                  ],
                ),
                const SizedBox(height: 16),
                AppCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      for (var i = 0; i < events.length; i++) ...[
                        if (i > 0) const Divider(height: 1),
                        _EventRow(
                          event: events[i],
                          payload:
                              _parsePayload('${events[i]['payload'] ?? ''}'),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '$value',
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class _EventRow extends StatelessWidget {
  const _EventRow({required this.event, required this.payload});

  final Map<String, Object?> event;
  final Map<String, String> payload;

  @override
  Widget build(BuildContext context) {
    final isSynced = (event['sync_status'] as int? ?? 0) == 1;
    final title = payload['vaccine'] ?? 'Vaccination';
    final patient = payload['patient'];
    final when = formatDateTime('${event['created_at'] ?? ''}');

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.softBlue,
              borderRadius: BorderRadius.circular(6),
            ),
            child: const Icon(
              Icons.vaccines_outlined,
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
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  patient == null ? when : '$patient · $when',
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          StatusBadge(
            label: isSynced ? 'Synced' : 'Pending',
            tone: isSynced ? BadgeTone.success : BadgeTone.warning,
          ),
        ],
      ),
    );
  }
}