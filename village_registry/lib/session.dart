import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

class Session {
  static String uid = '';
  static String villageId = '';
  static String role = '';
  static String name = '';
  static String deviceId = '';

  static bool get ready => uid.isNotEmpty && villageId.isNotEmpty;

  /// Call once before runApp.
  static Future<void> init() async {
    final p = await SharedPreferences.getInstance();
    deviceId = p.getString('deviceId') ?? const Uuid().v4();
    await p.setString('deviceId', deviceId);
  }

  /// Called whenever a user is signed in (fresh login OR cached session).
  static Future<void> load(User user) async {
    final p = await SharedPreferences.getInstance();
    uid = user.uid;
    villageId = p.getString('villageId:$uid') ?? '';
    role = p.getString('role:$uid') ?? '';
    name = p.getString('name:$uid') ?? '';

    try {
      final doc = await FirebaseFirestore.instance
          .collection('users')
          .doc(uid)
          .get(const GetOptions(source: Source.server))
          .timeout(const Duration(seconds: 10));
      if (doc.exists) {
        final d = doc.data()!;
        villageId = (d['villageId'] ?? '') as String;
        role = (d['role'] ?? 'worker') as String;
        name = (d['name'] ?? '') as String;
        await p.setString('villageId:$uid', villageId);
        await p.setString('role:$uid', role);
        await p.setString('name:$uid', name);
      } else {
        debugPrint('SYNC: no users/$uid document in Firestore');
      }
    } catch (e) {
      debugPrint('SYNC: profile fetch skipped (offline?) $e');
    }
  }

  static void clear() {
    uid = '';
    villageId = '';
    role = '';
    name = '';
  }
}