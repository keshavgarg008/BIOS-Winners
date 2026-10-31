import 'dart:convert';

class OfflineEvent {
  final String eventId;
  final String recordId;
  final String domain;
  final String fieldName;
  final String newValue;
  final String authorId;
  final String timestamp;
  final List<String> knownParentIds;

  OfflineEvent({
    required this.eventId,
    required this.recordId,
    required this.domain,
    required this.fieldName,
    required this.newValue,
    required this.authorId,
    required this.timestamp,
    required this.knownParentIds,
  });

  // Converts the object into a Map for SQLite insertion
  Map<String, dynamic> toMap() {
    return {
      'event_id': eventId,
      'record_id': recordId,
      'domain': domain,
      'field_name': fieldName,
      'new_value': newValue, 
      'author_id': authorId,
      'timestamp': timestamp,
      'known_parent_ids': jsonEncode(knownParentIds), // SQLite stores lists as JSON strings
      'approval_status': 'auto_approved',
    };
  }
}