import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../database_helper.dart';
import '../theme/app_theme.dart';
import '../widgets/common.dart';
import 'add_record_screen.dart';
import 'login_screen.dart';
import 'patients_screen.dart';
import 'sync_queue_screen.dart';

class _Destination {
  const _Destination(this.icon, this.label);
  final IconData icon;
  final String label;
}

const _destinations = [
  _Destination(Icons.people_outline, 'Patients'),
  _Destination(Icons.sync, 'Sync queue'),
];

/// Signed-in layout: sidebar + top bar on wide screens,
/// drawer + top bar on tablets and phones.
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final _searchController = TextEditingController();
  int _index = 0;

  @override
  void initState() {
    super.initState();
    DatabaseHelper.instance.refreshPendingCount();
    _searchController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  String get _email => FirebaseAuth.instance.currentUser?.email ?? 'Worker';

  void _select(int i) {
    setState(() => _index = i);
    _scaffoldKey.currentState?.closeDrawer();
  }

  void _openAddRecord(Patient patient) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => AddRecordScreen(patient: patient)),
    );
  }

  Future<void> _signOut() async {
    await FirebaseAuth.instance.signOut();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.of(context).size.width >= 900;

    final sidebar = AppSidebar(
      selectedIndex: _index,
      onSelect: _select,
      email: _email,
      onSignOut: _signOut,
    );

    final pages = <Widget>[
      PatientsScreen(
        query: _searchController.text,
        onSelectPatient: _openAddRecord,
      ),
      const SyncQueueScreen(),
    ];

    final content = Column(
      children: [
        _TopBar(
          showMenu: !wide,
          onMenu: () => _scaffoldKey.currentState?.openDrawer(),
          title: _destinations[_index].label,
          showSearch: _index == 0,
          searchController: _searchController,
          email: _email,
          compact: !wide,
          onOpenQueue: () => _select(1),
          onSignOut: _signOut,
        ),
        Expanded(child: pages[_index]),
      ],
    );

    return Scaffold(
      key: _scaffoldKey,
      drawer: wide
          ? null
          : Drawer(
              width: 248,
              backgroundColor: AppColors.navy,
              shape: const RoundedRectangleBorder(),
              child: SafeArea(child: sidebar),
            ),
      body: wide
          ? Row(
              children: [
                sidebar,
                Expanded(child: content),
              ],
            )
          : content,
    );
  }
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

class AppSidebar extends StatelessWidget {
  const AppSidebar({
    super.key,
    required this.selectedIndex,
    required this.onSelect,
    required this.email,
    required this.onSignOut,
  });

  final int selectedIndex;
  final ValueChanged<int> onSelect;
  final String email;
  final VoidCallback onSignOut;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 248,
      color: AppColors.navy,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppColors.navySecondary,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Icon(
                    Icons.vaccines_outlined,
                    color: Colors.white,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Village Health',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        'Worker portal',
                        style: TextStyle(
                          color: AppColors.onNavyMuted,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          for (var i = 0; i < _destinations.length; i++)
            _NavTile(
              icon: _destinations[i].icon,
              label: _destinations[i].label,
              selected: i == selectedIndex,
              onTap: () => onSelect(i),
              trailing: i == 1 ? const _PendingPill() : null,
            ),
          const Spacer(),
          const Divider(height: 1, color: AppColors.navySecondary),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Text(
              email,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.onNavyMuted,
                fontSize: 12,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _NavTile(
              icon: Icons.logout,
              label: 'Sign out',
              selected: false,
              onTap: onSignOut,
            ),
          ),
        ],
      ),
    );
  }
}

class _NavTile extends StatelessWidget {
  const _NavTile({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
    this.trailing,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final color = selected ? Colors.white : AppColors.onNavyMuted;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      child: Material(
        color: selected ? AppColors.navySecondary : Colors.transparent,
        borderRadius: BorderRadius.circular(6),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(6),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
            child: Row(
              children: [
                Icon(icon, size: 20, color: color),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    label,
                    style: TextStyle(
                      color: color,
                      fontSize: 14,
                      fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                    ),
                  ),
                ),
                ?trailing,
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PendingPill extends StatelessWidget {
  const _PendingPill();

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<int>(
      valueListenable: DatabaseHelper.instance.pendingCount,
      builder: (context, count, _) {
        if (count == 0) return const SizedBox.shrink();
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: AppColors.accent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            '$count',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.showMenu,
    required this.onMenu,
    required this.title,
    required this.showSearch,
    required this.searchController,
    required this.email,
    required this.compact,
    required this.onOpenQueue,
    required this.onSignOut,
  });

  final bool showMenu;
  final VoidCallback onMenu;
  final String title;
  final bool showSearch;
  final TextEditingController searchController;
  final String email;
  final bool compact;
  final VoidCallback onOpenQueue;
  final VoidCallback onSignOut;

  @override
  Widget build(BuildContext context) {
    final initial = email.isNotEmpty ? email[0].toUpperCase() : 'W';

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.card,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        bottom: false,
        child: SizedBox(
          height: 64,
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: compact ? 8 : 24),
            child: Row(
              children: [
                if (showMenu)
                  IconButton(
                    tooltip: 'Open menu',
                    icon: const Icon(Icons.menu),
                    onPressed: onMenu,
                  ),
                Expanded(
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 420),
                      child: showSearch
                          ? _SearchField(controller: searchController)
                          : Padding(
                              padding: const EdgeInsets.only(left: 8),
                              child: Text(
                                title,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                ValueListenableBuilder<int>(
                  valueListenable: DatabaseHelper.instance.pendingCount,
                  builder: (context, count, _) {
                    if (count == 0) return const SizedBox.shrink();
                    return Padding(
                      padding: const EdgeInsets.only(right: 12),
                      child: InkWell(
                        onTap: onOpenQueue,
                        borderRadius: BorderRadius.circular(6),
                        child: StatusBadge(
                          label: '$count pending',
                          tone: BadgeTone.warning,
                        ),
                      ),
                    );
                  },
                ),
                PopupMenuButton<String>(
                  tooltip: 'Account',
                  offset: const Offset(0, 48),
                  onSelected: (v) {
                    if (v == 'signout') onSignOut();
                  },
                  itemBuilder: (context) => [
                    PopupMenuItem<String>(
                      enabled: false,
                      child: Text(
                        email,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                    const PopupMenuDivider(),
                    const PopupMenuItem<String>(
                      value: 'signout',
                      child: Row(
                        children: [
                          Icon(Icons.logout, size: 18),
                          SizedBox(width: 10),
                          Text('Sign out'),
                        ],
                      ),
                    ),
                  ],
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircleAvatar(
                        radius: 16,
                        backgroundColor: AppColors.softBlue,
                        child: Text(
                          initial,
                          style: const TextStyle(
                            color: AppColors.navy,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      if (!compact) ...[
                        const SizedBox(width: 8),
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 180),
                          child: Text(
                            email,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 13),
                          ),
                        ),
                        const Icon(
                          Icons.keyboard_arrow_down,
                          size: 18,
                          color: AppColors.textSecondary,
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: TextField(
        controller: controller,
        textInputAction: TextInputAction.search,
        style: const TextStyle(fontSize: 14),
        decoration: InputDecoration(
          hintText: 'Search patients',
          isDense: true,
          fillColor: AppColors.background,
          contentPadding: const EdgeInsets.symmetric(vertical: 10),
          prefixIcon: const Icon(Icons.search, size: 20),
          suffixIcon: controller.text.isEmpty
              ? null
              : IconButton(
                  tooltip: 'Clear search',
                  icon: const Icon(Icons.close, size: 18),
                  onPressed: controller.clear,
                ),
        ),
      ),
    );
  }
}