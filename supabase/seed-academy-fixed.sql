-- ============================================================
-- LocalWala Academy - Production Seed File (Clean)
-- Topic: Mobile E-Commerce Development with LocalWala
-- Compatible with: Supabase / PostgreSQL
-- ============================================================
-- Contains:
--  1 Course | 5 Modules | 20 Lessons | 5 Module Quizzes (6 Q each = 30)
--  1 Final Assessment (30 unique questions)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

--------------------------------------------------------------
-- 1. COURSE
--------------------------------------------------------------
insert into academy_courses (
  id, title, slug, description, thumbnail_url,
  duration_minutes, difficulty, passing_score, is_published
) values (
  'a0000000-0000-0000-0000-000000000001',
  'LocalWala Academy: Mobile E-Commerce Mastery',
  'localwala-academy-mobileecommerce',
  'Master mobile app development with Flutter and Dart through the lens of a real hyperlocal e-commerce platform. This course covers everything from Dart fundamentals and Flutter widgets to local e-commerce UX patterns, backend integration, and deployment.',
  'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&auto=format&fit=crop&q=80',
  480,
  'intermediate',
  70,
  true
) on conflict (slug) do update set
  title         = excluded.title,
  description   = excluded.description,
  thumbnail_url = excluded.thumbnail_url,
  duration_minutes = excluded.duration_minutes,
  difficulty    = excluded.difficulty,
  passing_score = excluded.passing_score,
  is_published  = excluded.is_published;

--------------------------------------------------------------
-- 2. MODULES (5)
--------------------------------------------------------------
insert into academy_modules (
  id, course_id, title, order_no
) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'The Mobile E-Commerce Landscape', 1),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Dart Programming Deep Dive', 2),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Flutter Widgets & State Management', 3),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Building Local E-Commerce Features', 4),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Testing, CI/CD & Portfolio Readiness', 5)
on conflict do nothing;

--------------------------------------------------------------
-- 3. LESSONS (20 total - 4 per module)
--------------------------------------------------------------
insert into academy_lessons (
  id, module_id, title, content_md, video_url, duration_minutes, order_no
) values
-- Module 1: The Mobile E-Commerce Landscape
  (
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Welcome to LocalWala Academy',
    '# Welcome to LocalWala Academy

Welcome to your first step toward becoming a mobile e-commerce engineer.

## What You Will Learn
- Flutter & Dart from first principles
- Mobile UX patterns for local commerce
- Backend integration and offline resilience
- Testing, CI/CD, and production deployment

## Tips for Success
1. Code along with every example.
2. Complete the exercises at the end of each lesson.
3. Test yourself with the module quizzes.

> "The best way to predict the future is to invent it." â€” Alan Kay',
    null, 10, 1
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'The Rise of Local E-Commerce',
    '# The Rise of Local E-Commerce

Hyperlocal commerce is transforming how communities buy and sell.

## Key Trends
- **Same-day delivery**: Customers expect delivery within hours.
- **Mobile-first adoption**: Over 80% of orders from apps.
- **Trust & social proof**: Ratings drive 60% of decisions.

## Why LocalWala?
LocalWala connects local businesses with nearby customers, reducing delivery times.',
    null, 12, 2
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    'Career Paths in Mobile Engineering',
    '# Career Paths in Mobile Engineering

Mobile app development offers diverse, high-growth career paths.

## Roles
- **Flutter Developer**: Build cross-platform mobile apps.
- **Mobile UI/UX Designer**: Design intuitive interfaces.
- **Backend Engineer**: Design APIs and real-time systems.
- **QA Engineer**: Test for bugs, usability, and edge cases.

## Internship at LocalWala
Interns work on production features and contribute to the app used by thousands of users daily.',
    null, 10, 3
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001',
    'How LocalWala Works',
    '# How LocalWala Works

LocalWala is a three-sided marketplace connecting Customers, Vendors, and Delivery Partners.

## Tech Stack Snapshot
- **Frontend**: Flutter
- **Backend**: Node.js / PostgreSQL
- **Real-time**: WebSockets
- **Notifications**: Firebase Cloud Messaging

Understanding this flow is essential before you write a single line of Flutter code.',
    null, 15, 4
  ),

-- Module 2: Dart Programming Deep Dive
  (
    'c0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000002',
    'Dart Variables & Types',
    $$# Dart Variables & Types

Dart is the programming language behind Flutter. It is strongly typed and null-safe.

## Variable Declaration
```dart
String name = 'LocalWala';
int orders = 150;
double rating = 4.5;
bool isLoggedIn = true;
```

## Null Safety
```dart
String? nullableName;      // can be null
String nonNullable = '';   // cannot be null
String? maybeName = nullableName ?? 'Guest';
```$$,
    null, 10, 1
  ),
  (
    'c0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000002',
    'Functions & Control Flow',
    $$# Functions & Control Flow

Dart supports top-level, nested, and anonymous functions.

## Basic Function
```dart
int add(int a, int b) => a + b;
String greet(String name) => 'Hello, $name!';
```

## Control Flow
```dart
if (status == 'active') {
  showProductList();
} else {
  showError();
}
```

## Closures
Functions can capture variables from their enclosing scopeâ€”essential for callbacks in Flutter.$$,
    null, 10, 2
  ),
  (
    'c0000000-0000-0000-0000-000000000007',
    'b0000000-0000-0000-0000-000000000002',
    'Classes, OOP & Models',
    '# Classes, OOP & Models

Object-oriented programming lets you model real-world entities like Product, Order, and User.

## Defining a Model
```dart
class Product {
  final String id;
  final String name;
  final double price;

  Product({required this.id, required this.name, required this.price});
}
```

## Enums
```dart
enum OrderStatus { pending, confirmed, preparing, delivered }
```

OOP keeps your Flutter codebase maintainable as the app scales.',
    null, 12, 3
  ),
  (
    'c0000000-0000-0000-0000-000000000008',
    'b0000000-0000-0000-0000-000000000002',
    'Async Programming & APIs',
    $$# Async Programming & APIs

Mobile apps constantly fetch data from servers. Dart handles this elegantly.

## Future & Async/Await
```dart
Future<List<Product>> fetchProducts() async {
  final response = await http.get(Uri.parse('https://api.localwala.com/products'));
  if (response.statusCode == 200) {
    final List data = jsonDecode(response.body);
    return data.map((json) => Product.fromJson(json)).toList();
  }
  throw Exception('Failed to load products');
}
```

## Streams
Streams power real-time features like order tracking in LocalWala.$$,
    null, 12, 4
  ),

-- Module 3: Flutter Widgets & State Management
  (
    'c0000000-0000-0000-0000-000000000009',
    'b0000000-0000-0000-0000-000000000003',
    'Stateless vs Stateful Widgets',
    '# Stateless vs Stateful Widgets

Every Flutter UI element is a widget.

## StatelessWidget
Use when UI does not depend on mutable data.

## StatefulWidget
Use when UI must rebuild in response to state changes.

## Rule of Thumb
Start with StatelessWidget. Upgrade to StatefulWidget only when the widget must own mutable state.',
    null, 10, 1
  ),
  (
    'c0000000-0000-0000-0000-000000000010',
    'b0000000-0000-0000-0000-000000000003',
    'Layouts: Row, Column, Stack, Expanded',
    '# Layouts: Row, Column, Stack, Expanded

Flutter layout is declarative: you describe the tree, Flutter paints it.

## Row (Horizontal)
Used for aligning items horizontally.

## Column (Vertical)
Used for stacking items vertically.

## Expanded
Use Expanded to fill remaining space in a Row or Column.

## Stack
Use Stack for overlays like badges on images.',
    null, 10, 2
  ),
  (
    'c0000000-0000-0000-0000-000000000011',
    'b0000000-0000-0000-0000-000000000003',
    'Provider & Riverpod Patterns',
    '# Provider & Riverpod Patterns

State management determines how data moves through your app.

## Provider (Quick Start)
```dart
final cartProvider = ChangeNotifierProvider((_) => CartModel());
context.watch<CartModel>().items.length;
```

## Riverpod (Modern)
```dart
final filteredProductsProvider = Provider<List<Product>>((ref) {
  final query = ref.watch(searchQueryProvider);
  final all = ref.watch(productsProvider);
  return all.where((p) => p.name.contains(query)).toList();
});
```

For LocalWala-scale apps, prefer Riverpod or Bloc for testability.',
    null, 12, 3
  ),
  (
    'c0000000-0000-0000-0000-000000000012',
    'b0000000-0000-0000-0000-000000000003',
    'Navigation & Deep Linking',
    $$# Navigation & Deep Linking

Users expect seamless movement between screens.

## Navigator Basics
```dart
Navigator.push(context, MaterialPageRoute(builder: (_) => CartScreen()));
Navigator.pop(context);
```

## GoRouter (Recommended)
```dart
final router = GoRouter(
  routes: [
    GoRoute(path: '/', builder: (_, __) => HomeScreen()),
    GoRoute(path: '/product/:id', builder: (_, s) => ProductScreen(id: s.params['id']!)),
  ],
);
```

A notification should open the Order Tracking screen directly, even if the app was closed. GoRouter handles this.$$,
    null, 10, 4
  ),

-- Module 4: Building Local E-Commerce Features
  (
    'c0000000-0000-0000-0000-000000000013',
    'b0000000-0000-0000-0000-000000000004',
    'Product Listings & Search',
    $$# Product Listings & Search

Efficient product discovery drives conversions in local e-commerce.

## Search Bar
```dart
TextField(
  onChanged: (query) => context.read(searchProvider).update(query),
  decoration: InputDecoration(hintText: 'Search burgers, pizza...'),
)
```

## Debounce
Avoid excessive API calls by waiting 300ms after the user stops typing.

## LocalWala Pattern
Restaurants use a vertical list, categories use a horizontal scroll, and products use a grid.$$,
    null, 10, 1
  ),
  (
    'c0000000-0000-0000-0000-000000000014',
    'b0000000-0000-0000-0000-000000000004',
    'Cart Management & Persistence',
    '# Cart Management & Persistence

The cart is the heart of any e-commerce flow.

## Cart State
```dart
class CartModel extends ChangeNotifier {
  final List<CartItem> _items = [];
  int get total => _items.fold(0, (sum, i) => sum + i.product.price * i.quantity);
  void add(Product p) { _items.add(CartItem(product: p)); notifyListeners(); }
}
```

## Persistence
Use SharedPreferences or Hive to persist cart across app restarts.

## Merge on Login
When the user logs in, merge the local cart with the server cart.',
    null, 10, 2
  ),
  (
    'c0000000-0000-0000-0000-000000000015',
    'b0000000-0000-0000-0000-000000000004',
    'Checkout & Payment Integration',
    '# Checkout & Payment Integration

The checkout flow converts intent into revenue.

## Steps
1. Address selection
2. Order summary
3. Payment method
4. Place order

## Optimistic UI
Show "Order Placed!" immediately while the network request completes.

## LocalWala Checkout Flow
Address -> Summary -> Payment -> Confirmation.',
    null, 12, 3
  ),
  (
    'c0000000-0000-0000-0000-000000000016',
    'b0000000-0000-0000-0000-000000000004',
    'Order Tracking & Notifications',
    '# Order Tracking & Notifications

Keeping customers informed reduces anxiety and support load.

## Tracking Stages
confirmed -> preparing -> ready -> out_for_delivery -> delivered

## Real-Time Updates
```dart
StreamBuilder<OrderStatus>(
  stream: orderService.trackOrder(orderId),
  builder: (context, snapshot) { return StatusChip(status: snapshot.data); },
)
```

## Push Notifications
Use FirebaseMessaging.onMessageOpenedApp to navigate user to correct screen on tap.',
    null, 10, 4
  ),

-- Module 5: Testing, CI/CD & Portfolio Readiness
  (
    'c0000000-0000-0000-0000-000000000017',
    'b0000000-0000-0000-0000-000000000005',
    'Unit & Widget Testing',
    $$# Unit & Widget Testing

Testing catches bugs before users do.

## Unit Test Example
```dart
test('calculateTotal returns correct sum', () {
  final cart = CartModel();
  cart.add(Product(id: '1', name: 'Pizza', price: 200));
  expect(cart.total, equals(200));
});
```

## Widget Test Example
```dart
testWidgets('Add to cart button increments count', (tester) async {
  await tester.pumpWidget(CartScreen());
  await tester.tap(find.byIcon(Icons.add_shopping_cart));
  expect(find.text('1 in cart'), findsOneWidget);
});
```$$,
    null, 10, 1
  ),
  (
    'c0000000-0000-0000-0000-000000000018',
    'b0000000-0000-0000-0000-000000000005',
    'Integration Testing',
    $$# Integration Testing

Unit tests verify units. Integration tests verify complete user journeys end-to-end.

## Using integration_test
```dart
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('place order flow', (tester) async {
    app.main();
    await tester.pumpAndSettle();
    await tester.tap(find.text('Place Order'));
    expect(find.text('Order Placed!'), findsOneWidget);
  });
}
```

## What to Cover
- Happy path: browse -> cart -> checkout -> confirmed.
- Sad path: no internet, payment failure, empty cart.$$,
    null, 12, 2
  ),
  (
    'c0000000-0000-0000-0000-000000000019',
    'b0000000-0000-0000-0000-000000000005',
    'CI/CD & Deployment',
    '# CI/CD & Deployment

Deploying a Flutter app requires platform-specific configuration and automation.

## Build Commands
```bash
flutter build apk --release   # Android
flutter build ios --release   # iOS
```

## CI/CD with GitHub Actions
Automate builds on every release.

## Over-The-Air Updates
Tools like Shorebird let you ship patches without app store review.

## Pre-Launch Checklist
- App name, icon, splash screen.
- Permissions declared in AndroidManifest / Info.plist.',
    null, 10, 3
  ),
  (
    'c0000000-0000-0000-0000-000000000020',
    'b0000000-0000-0000-0000-000000000005',
    'Building Your Portfolio',
    '# Building Your Portfolio

Your portfolio proves what you can ship.

## Must-Have Projects
1. Local Commerce Demo App
2. Real-Time Order Tracker
3. Offline-First Notes App

## GitHub Best Practices
- Clean README with screenshots.
- Keep branches focused.
- Write descriptive commit messages.

> "Code tells you how. Comments tell you why."',
    null, 12, 4
  )
on conflict (id) do nothing;

--------------------------------------------------------------
-- 4. MODULE QUIZZES (5 quizzes, 6 questions each = 30 total)
--------------------------------------------------------------
insert into academy_quizzes (
  id, module_id, title, passing_score, time_limit_minutes
) values
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Module 1 Quiz: The Mobile E-Commerce Landscape', 70, 10),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Module 2 Quiz: Dart Programming Deep Dive', 70, 10),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'Module 3 Quiz: Flutter Widgets & State Management', 70, 10),
  ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 'Module 4 Quiz: Building Local E-Commerce Features', 70, 10),
  ('d0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005', 'Module 5 Quiz: Testing, CI/CD & Portfolio Readiness', 70, 10)
on conflict do nothing;

--------------------------------------------------------------
-- 5. MODULE QUIZ QUESTIONS (6 per quiz = 30 total)
--------------------------------------------------------------
insert into academy_questions (
  id, quiz_id, question, option_a, option_b, option_c, option_d,
  correct_option, explanation, difficulty, category, tags
) values

-- Quiz 1: Module 1
  (
    'e0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'LocalWala primarily operates as a:',
    'Global marketplace',
    'Hyperlocal commerce platform',
    'Social network',
    'Cloud provider',
    'b',
    'LocalWala connects local businesses with nearby customers.',
    'easy', 'LocalWala Business Model', '{localwala,hyperlocal}'
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000001',
    'Which of the following is NOT a career path in mobile engineering?',
    'Flutter Developer',
    'Mobile UI/UX Designer',
    'Backend Engineer',
    'HR Manager',
    'd',
    'HR Manager is a general corporate role, not specific to mobile engineering.',
    'easy', 'Career Paths', '{careers,roles}'
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000001',
    'Hyperlocal commerce typically delivers within:',
    'Week',
    'Hours or same-day',
    'Month',
    'Year',
    'b',
    'Hyperlocal means local delivery within hours or the same day.',
    'easy', 'E-Commerce', '{hyperlocal,delivery}'
  ),
  (
    'e0000000-0000-0000-0000-000000000004',
    'd0000000-0000-0000-0000-000000000001',
    'In LocalWala, who manages menus and accepts orders?',
    'Customers',
    'Delivery Partners',
    'Vendors',
    'Founders',
    'c',
    'Vendors manage their listings and accept or reject incoming orders.',
    'easy', 'LocalWala Ecosystem', '{localwala,vendors}'
  ),
  (
    'e0000000-0000-0000-0000-000000000005',
    'd0000000-0000-0000-0000-000000000001',
    'What technology powers real-time notifications in LocalWala?',
    'SMTP',
    'Firebase Cloud Messaging',
    'SMS Gateway',
    'Pigeons',
    'b',
    'FCM is the standard for push notifications in Flutter apps.',
    'medium', 'Notifications', '{fcm,notifications}'
  ),
  (
    'e0000000-0000-0000-0000-000000000006',
    'd0000000-0000-0000-0000-000000000001',
    'Which metric reflects local commerce growth potential?',
    'CAGR',
    'RAM usage',
    'CPU temperature',
    'Ping',
    'a',
    'CAGR (Compound Annual Growth Rate) is the standard market growth metric.',
    'medium', 'Business Metrics', '{cagr,growth}'
  ),

-- Quiz 2: Module 2
  (
    'e0000000-0000-0000-0000-000000000007',
    'd0000000-0000-0000-0000-000000000002',
    'Which keyword makes a type nullable in Dart?',
    'var',
    'dynamic',
    'late',
    '?',
    'd',
    'Appending ? to a type makes it nullable.',
    'easy', 'Dart', '{dart,null-safety}'
  ),
  (
    'e0000000-0000-0000-0000-000000000008',
    'd0000000-0000-0000-0000-000000000002',
    'What type does this function return: Future<String> fetchName() => Future.value("LocalWala");',
    'Future<String>',
    'String',
    'void',
    'int',
    'a',
    'The function signature explicitly declares Future<String>.',
    'easy', 'Async Dart', '{future,async,dart}'
  ),
  (
    'e0000000-0000-0000-0000-000000000009',
    'd0000000-0000-0000-0000-000000000002',
    'In Dart, which collection is best for ordered, unique items?',
    'List',
    'Map',
    'Set',
    'Queue',
    'c',
    'A Set by definition contains unique elements.',
    'easy', 'Collections', '{dart,set}'
  ),
  (
    'e0000000-0000-0000-0000-000000000010',
    'd0000000-0000-0000-0000-000000000002',
    'The required keyword in Dart ensures:',
    'Faster execution',
    'Compile-time non-nullable check',
    'Smaller binary size',
    'Auto-serialization',
    'b',
    'required forces callers to pass the argument, improving null safety.',
    'medium', 'OOP', '{dart,constructors}'
  ),
  (
    'e0000000-0000-0000-0000-000000000011',
    'd0000000-0000-0000-0000-000000000002',
    'How do you handle errors in async Dart code?',
    'try-catch-finally',
    'if-else',
    'switch-on-error',
    'throw-and-exit',
    'a',
    'Dart supports try, catch, and finally like C-style languages.',
    'medium', 'Error Handling', '{dart,error-handling}'
  ),
  (
    'e0000000-0000-0000-0000-000000000012',
    'd0000000-0000-0000-0000-000000000002',
    'Streams in Dart are best described as:',
    'Single async event',
    'Sequence of async events over time',
    'Database table',
    'File system',
    'b',
    'A Stream is a sequence of asynchronous events, ideal for real-time features.',
    'medium', 'Streams', '{dart,streams}'
  ),

-- Quiz 3: Module 3
  (
    'e0000000-0000-0000-0000-000000000013',
    'd0000000-0000-0000-0000-000000000003',
    'When should you use StatelessWidget?',
    'When UI changes on user input',
    'When UI is fully determined by constructor params',
    'When you need AnimationController',
    'When widget holds mutable state',
    'b',
    'StatelessWidget renders once and never rebuilds from internal state.',
    'easy', 'Flutter Widgets', '{flutter,stateless}'
  ),
  (
    'e0000000-0000-0000-0000-000000000014',
    'd0000000-0000-0000-0000-000000000003',
    'Which widget stretches to fill remaining space?',
    'Container',
    'Expanded',
    'Center',
    'Opacity',
    'b',
    'Expanded is used inside Row/Column to consume remaining space.',
    'easy', 'Layout', '{flutter,expanded}'
  ),
  (
    'e0000000-0000-0000-0000-000000000015',
    'd0000000-0000-0000-0000-000000000003',
    'Provider notifies listeners by calling:',
    'setState',
    'notifyListeners',
    'updateWidget',
    'invalidateCache',
    'b',
    'ChangeNotifier exposes notifyListeners() to signal rebuilds.',
    'easy', 'State Management', '{flutter,provider}'
  ),
  (
    'e0000000-0000-0000-0000-000000000016',
    'd0000000-0000-0000-0000-000000000003',
    'Which navigation package supports deep links declaratively?',
    'Navigator 1.0',
    'GoRouter',
    'URL launcher',
    'WebView',
    'b',
    'GoRouter is Google recommended declarative routing for Flutter.',
    'medium', 'Navigation', '{flutter,gorouter}'
  ),
  (
    'e0000000-0000-0000-0000-000000000017',
    'd0000000-0000-0000-0000-000000000003',
    'ListView.builder is ideal for:',
    'A fixed list of 3 items',
    'Large or infinite lists with lazy loading',
    'Animations only',
    'Static grids',
    'b',
    'ListView.builder builds only visible children, saving memory.',
    'medium', 'Performance', '{flutter,listview}'
  ),
  (
    'e0000000-0000-0000-0000-000000000018',
    'd0000000-0000-0000-0000-000000000003',
    'Riverpod providers should be declared:',
    'Inside build methods',
    'At the top level or in a providers file',
    'Inside onPressed callbacks',
    'In AndroidManifest',
    'b',
    'Declaring providers globally avoids duplicate instances and improves testability.',
    'medium', 'Riverpod', '{flutter,riverpod}'
  ),

-- Quiz 4: Module 4
  (
    'e0000000-0000-0000-0000-000000000019',
    'd0000000-0000-0000-0000-000000000004',
    'Debouncing search input prevents:',
    'Better UX',
    'Excessive API calls',
    'Screen flicker',
    'Cache poisoning',
    'b',
    'Debouncing waits until the user pauses typing before sending the query.',
    'easy', 'UX', '{search,debounce}'
  ),
  (
    'e0000000-0000-0000-0000-000000000020',
    'd0000000-0000-0000-0000-000000000004',
    'Where should the cart survive app restarts?',
    'RAM only',
    'Local storage such as Hive',
    'Server only',
    'URL query params',
    'b',
    'Local storage prevents cart loss when the app is killed or offline.',
    'easy', 'Offline', '{cart,hive,storage}'
  ),
  (
    'e0000000-0000-0000-0000-000000000021',
    'd0000000-0000-0000-0000-000000000004',
    'Checkout flow best practice:',
    'Skip address verification',
    'Optimistic UI with rollback on failure',
    'Auto-place order on add to cart',
    'Show price in cents only',
    'b',
    'Optimistic UI feels fast. Rollback gracefully if the network call fails.',
    'medium', 'Checkout', '{checkout,ux}'
  ),
  (
    'e0000000-0000-0000-0000-000000000022',
    'd0000000-0000-0000-0000-000000000004',
    'Order status updates are best delivered via:',
    'Polling a sync endpoint only',
    'Streams or WebSockets',
    'Email weekly digest',
    'SMS hidden messages',
    'b',
    'WebSockets or Firebase Realtime Database push status updates instantly.',
    'medium', 'Real-Time', '{orders,websocket}'
  ),
  (
    'e0000000-0000-0000-0000-000000000023',
    'd0000000-0000-0000-0000-000000000004',
    'Push notifications when app is closed require:',
    'Notification channel on Android',
    'Foreground service',
    'Root access',
    'Debug mode',
    'a',
    'Android requires a NotificationChannel for any background notification.',
    'medium', 'Notifications', '{push,fcm,mobile}'
  ),
  (
    'e0000000-0000-0000-0000-000000000024',
    'd0000000-0000-0000-0000-000000000004',
    'FCM onMessageOpenedApp is useful for:',
    'Printing logs',
    'Navigating user to a specific screen on notification tap',
    'Registering the device token',
    'Cleaning the cache',
    'b',
    'onMessageOpenedApp lets you route the user to the right content.',
    'medium', 'FCM', '{fcm,notifications}'
  ),

-- Quiz 5: Module 5
  (
    'e0000000-0000-0000-0000-000000000025',
    'd0000000-0000-0000-0000-000000000005',
    'Which test verifies individual functions?',
    'Integration test',
    'Unit test',
    'E2E test',
    'Smoke test',
    'b',
    'Unit tests test individual functions or methods in isolation.',
    'easy', 'Testing', '{unit-test,testing}'
  ),
  (
    'e0000000-0000-0000-0000-000000000026',
    'd0000000-0000-0000-0000-000000000005',
    'testWidgets is used for:',
    'Network tests',
    'Widget rendering and interaction tests',
    'Database migrations',
    'CI scripts',
    'b',
    'testWidgets verifies UI renders correctly and responds to input.',
    'easy', 'Testing', '{flutter,widget-test}'
  ),
  (
    'e0000000-0000-0000-0000-000000000027',
    'd0000000-0000-0000-0000-000000000005',
    'Which command creates a release-ready Android APK?',
    'flutter run',
    'flutter build apk --release',
    'flutter pub get',
    'flutter debug',
    'b',
    'flutter build apk --release produces a signed release binary.',
    'easy', 'Deployment', '{flutter,build,android}'
  ),
  (
    'e0000000-0000-0000-0000-000000000028',
    'd0000000-0000-0000-0000-000000000005',
    'A strong GitHub portfolio for an intern should emphasize:',
    'Certificates only',
    'Real projects with working code',
    'Largest number of repos',
    'Secret private repos',
    'b',
    'Employers look for deployable, documented projects.',
    'medium', 'Portfolio', '{github,portfolio}'
  ),
  (
    'e0000000-0000-0000-0000-000000000029',
    'd0000000-0000-0000-0000-000000000005',
    'CI/CD stands for:',
    'Code integration and continuous delivery',
    'Continuous Integration and Continuous Deployment',
    'Cloud instance and CDN',
    'Compile and install dependencies',
    'b',
    'CI/CD automates testing and deployment pipelines.',
    'medium', 'DevOps', '{ci-cd,deployment}'
  ),
  (
    'e0000000-0000-0000-0000-000000000030',
    'd0000000-0000-0000-0000-000000000005',
    'ProGuard is primarily used for:',
    'Building UI widgets',
    'Shrinking and obfuscating release code',
    'Writing test cases',
    'Managing images',
    'b',
    'ProGuard reduces APK size and makes reverse-engineering harder.',
    'medium', 'Android', '{proguard,android}'
  )
on conflict (id) do nothing;

--------------------------------------------------------------
-- 6. FINAL ASSESSMENT (30 unique questions - no overlap with module quizzes)
--------------------------------------------------------------
insert into academy_quizzes (
  id, module_id, title, passing_score, time_limit_minutes
) values
  (
    'f0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Final Assessment: LocalWala Academy Mastery Exam',
    75,
    45
  )
on conflict do nothing;

insert into academy_questions (
  id, quiz_id, question, option_a, option_b, option_c, option_d,
  correct_option, explanation, difficulty, category, tags
) values

  (
    'e0000000-0000-0000-0000-000000000200',
    'f0000000-0000-0000-0000-000000000001',
    'Which technology is used to build LocalWala mobile apps?',
    'React Native',
    'Flutter',
    'Swift',
    'Kotlin',
    'b',
    'LocalWala uses Flutter for cross-platform mobile development.',
    'easy', 'Mobile Tech', '{localwala,flutter}'
  ),
  (
    'e0000000-0000-0000-0000-000000000201',
    'f0000000-0000-0000-0000-000000000001',
    'What is the primary programming language for Flutter?',
    'JavaScript',
    'Dart',
    'Python',
    'TypeScript',
    'b',
    'Flutter is built on the Dart programming language.',
    'easy', 'Flutter', '{dart,flutter,language}'
  ),
  (
    'e0000000-0000-0000-0000-000000000202',
    'f0000000-0000-0000-0000-000000000001',
    'Which HTTP method should you use to update an existing order?',
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'c',
    'PUT updates existing resources.',
    'easy', 'REST API', '{http,put,rest}'
  ),
  (
    'e0000000-0000-0000-0000-000000000203',
    'f0000000-0000-0000-0000-000000000001',
    'In LocalWala, which party manages product listings?',
    'Customer',
    'Delivery Partner',
    'Vendor',
    'Admin only',
    'c',
    'Vendors manage their own menus and product listings.',
    'easy', 'LocalWala', '{localwala,vendors}'
  ),
  (
    'e0000000-0000-0000-0000-000000000204',
    'f0000000-0000-0000-0000-000000000001',
    'What does hot reload do in Flutter?',
    'Restarts the app',
    'Injects updated source code into the running VM',
    'Clears the build cache',
    'Deploys to the Play Store',
    'b',
    'Hot reload preserves app state while updating code.',
    'easy', 'Flutter', '{flutter,hot-reload}'
  ),
  (
    'e0000000-0000-0000-0000-000000000205',
    'f0000000-0000-0000-0000-000000000001',
    'Which widget type rebuilds when its internal state changes?',
    'StatelessWidget',
    'StatefulWidget',
    'InheritedWidget',
    'RenderObject',
    'b',
    'StatefulWidget owns mutable state and rebuilds on change.',
    'easy', 'Flutter', '{flutter,stateful}'
  ),
  (
    'e0000000-0000-0000-0000-000000000206',
    'f0000000-0000-0000-0000-000000000001',
    'Persisting cart data across app restarts is handled by:',
    'RAM only',
    'Local storage such as Hive',
    'Server on every add',
    'URL hash',
    'b',
    'Local storage survives process death and works offline.',
    'medium', 'Offline', '{cart,hive,storage}'
  ),
  (
    'e0000000-0000-0000-0000-000000000207',
    'f0000000-0000-0000-0000-000000000001',
    'Which construct enforces non-nullable function parameters in Dart?',
    'optional',
    'required',
    'mandatory',
    'strict',
    'b',
    'required forces the caller to provide the argument at compile time.',
    'medium', 'Dart', '{dart,null-safety}'
  ),
  (
    'e0000000-0000-0000-0000-000000000208',
    'f0000000-0000-0000-0000-000000000001',
    'JWT tokens should be stored using:',
    'Plain SharedPreferences',
    'flutter_secure_storage',
    'A global String variable',
    'URL parameters',
    'b',
    'Secure storage encrypts tokens and prevents theft on rooted devices.',
    'medium', 'Security', '{jwt,auth,security}'
  ),
  (
    'e0000000-0000-0000-0000-000000000209',
    'f0000000-0000-0000-0000-000000000001',
    'GoRouter is primarily used for:',
    'State management',
    'Declarative routing and deep linking',
    'Database migrations',
    'Image caching',
    'b',
    'GoRouter provides declarative routing with deep-link support.',
    'medium', 'Navigation', '{flutter,gorouter}'
  ),
  (
    'e0000000-0000-0000-0000-000000000210',
    'f0000000-0000-0000-0000-000000000001',
    'ListView.builder benefit:',
    'Builds all children at once',
    'Lazily builds only visible children',
    'Only supports exactly five items',
    'Disables scrolling',
    'b',
    'Lazy building keeps memory footprint low for large lists.',
    'medium', 'Performance', '{flutter,listview}'
  ),
  (
    'e0000000-0000-0000-0000-000000000211',
    'f0000000-0000-0000-0000-000000000001',
    'A Stream in Dart represents:',
    'A single future value',
    'A sequence of values over time',
    'A file handle',
    'A widget tree',
    'b',
    'Streams are the Dart mechanism for reactive, real-time data.',
    'medium', 'Dart', '{dart,streams}'
  ),
  (
    'e0000000-0000-0000-0000-000000000212',
    'f0000000-0000-0000-0000-000000000001',
    'Riverpod should avoid:',
    'Global provider declarations',
    'Duplicate provider instances',
    'Unit testing',
    'Async code',
    'b',
    'Duplicate providers cause state inconsistency across the widget tree.',
    'medium', 'State Management', '{flutter,riverpod}'
  ),
  (
    'e0000000-0000-0000-0000-000000000213',
    'f0000000-0000-0000-0000-000000000001',
    'Which RLS policy restricts who can read courses?',
    'is_published = true for anon users',
    'No restrictions at all',
    'Role = admin only',
    'Email domain check',
    'a',
    'The existing policy allows anyone to select published courses.',
    'medium', 'Supabase', '{rls,supabase}'
  ),
  (
    'e0000000-0000-0000-0000-000000000214',
    'f0000000-0000-0000-0000-000000000001',
    'Navigation.pushReplacement is useful for:',
    'Pushing a new route on top of stack',
    'Replacing the current route so back does not return',
    'Popping all routes',
    'Showing a Dialog',
    'b',
    'pushReplacement prevents the user from going back to the login screen.',
    'medium', 'Flutter', '{flutter,navigation}'
  ),
  (
    'e0000000-0000-0000-0000-000000000215',
    'f0000000-0000-0000-0000-000000000001',
    'Which database is a fast, lightweight NoSQL database for Flutter?',
    'SQLite',
    'PostgreSQL',
    'Hive',
    'MongoDB',
    'c',
    'Hive is purpose-built for Flutter with zero native dependencies.',
    'medium', 'Storage', '{hive,offline,flutter}'
  ),
  (
    'e0000000-0000-0000-0000-000000000216',
    'f0000000-0000-0000-0000-000000000001',
    'FCM data messages differ because:',
    'Data messages deliver even when app is closed without system alerts',
    'Notification messages are larger',
    'Data messages are deprecated',
    'They use SMS',
    'a',
    'Data messages give you full control for in-app handling.',
    'medium', 'Notifications', '{fcm,notifications}'
  ),
  (
    'e0000000-0000-0000-0000-000000000217',
    'f0000000-0000-0000-0000-000000000001',
    'A good Git commit message should:',
    'Describe the exact file changed',
    'Describe the intent or reason for the change',
    'Be emoji-heavy',
    'Be one character long',
    'b',
    'Commit messages should explain why, not just what files.',
    'medium', 'Professional Skills', '{git,code-review}'
  ),
  (
    'e0000000-0000-0000-0000-000000000218',
    'f0000000-0000-0000-0000-000000000001',
    'What does a ProvisioningProfile identify?',
    'The app version number',
    'Which devices can run a signed iOS app',
    'Dart version',
    'Android package name',
    'b',
    'Provisioning profiles map an app to an Apple Developer account.',
    'hard', 'iOS', '{ios,provisioning}'
  ),
  (
    'e0000000-0000-0000-0000-000000000219',
    'f0000000-0000-0000-0000-000000000001',
    'Which represents an O(n) operation for displaying a restaurant list?',
    'Nested loop search',
    'Single pass render with ListView.builder',
    'Nested sort before display',
    'Map every item to five widgets',
    'b',
    'ListView.builder is linear and does not preload all children.',
    'hard', 'Algorithms', '{algorithms,performance}'
  ),
  (
    'e0000000-0000-0000-0000-000000000220',
    'f0000000-0000-0000-0000-000000000001',
    'Which approach best separates business logic from UI in Flutter?',
    'MVC without layers',
    'Clean Architecture with data/domain/presentation layers',
    'Put everything in main.dart',
    'Use static methods only',
    'b',
    'Clean Architecture scales best and improves testability.',
    'hard', 'Architecture', '{architecture,clean-arch}'
  ),
  (
    'e0000000-0000-0000-0000-000000000221',
    'f0000000-0000-0000-0000-000000000001',
    'How do Codemagic or GitHub Actions help Flutter teams?',
    'Manually deploy each build',
    'Automate builds and tests across platforms',
    'Replace code review',
    'Generate Dart syntax automatically',
    'b',
    'CI/CD automates build, test, and deploy pipelines.',
    'hard', 'CI/CD', '{ci-cd,github-actions}'
  ),
  (
    'e0000000-0000-0000-0000-000000000222',
    'f0000000-0000-0000-0000-000000000001',
    'A robust checkout protocol describes:',
    'A discount algorithm',
    'A multi-step checkout with fallback handling',
    'An offline database',
    'A logging standard',
    'b',
    'Robust checkout protocols handle timeouts and fallback routes gracefully.',
    'hard', 'Payments', '{checkout,payments}'
  ),
  (
    'e0000000-0000-0000-0000-000000000223',
    'f0000000-0000-0000-0000-000000000001',
    'Why separate business logic from UI?',
    'To make the app look colorful',
    'To enable independent testing and reuse across screens',
    'To reduce APK size arbitrarily',
    'To remove all Dart files',
    'b',
    'Separated logic is testable, reusable, and easier to debug.',
    'hard', 'Architecture', '{clean-arch,testing}'
  ),
  (
    'e0000000-0000-0000-0000-000000000224',
    'f0000000-0000-0000-0000-000000000001',
    'The Observer pattern in Flutter state management is implemented via:',
    'InheritedWidget and ChangeNotifier',
    'Raw SQL triggers',
    'File watchers',
    'Kernel drivers',
    'a',
    'InheritedWidget and ChangeNotifier form the reactive foundation.',
    'hard', 'Design Patterns', '{flutter,observer,patterns}'
  ),
  (
    'e0000000-0000-0000-0000-000000000225',
    'f0000000-0000-0000-0000-000000000001',
    'Which represents the PATCH approach in REST APIs?',
    'Update only the order current_status field',
    'Replace the entire order record',
    'Delete and re-create order',
    'Never update orders',
    'a',
    'PATCH modifies specific fields, saving bandwidth and reducing conflicts.',
    'hard', 'REST API', '{rest,patch,api}'
  ),
  (
    'e0000000-0000-0000-0000-000000000226',
    'f0000000-0000-0000-0000-000000000001',
    'StreamProvider pairs with which paradigm for real-time UI?',
    'Callback hell',
    'Stream-based UI with automatic rebuilds',
    'Only static widgets',
    'GlobalKey everywhere',
    'b',
    'StreamProvider automatically rebuilds UI when stream emits new values.',
    'hard', 'State Management', '{flutter,provider,streams}'
  ),
  (
    'e0000000-0000-0000-0000-000000000227',
    'f0000000-0000-0000-0000-000000000001',
    'In LocalWala checkout, which field represents PATCH semantics?',
    'order_id',
    'order_total',
    'current_status',
    'created_at',
    'c',
    'current_status is updated incrementally as the order progresses.',
    'hard', 'REST API', '{rest,patch,localwala}'
  ),
  (
    'e0000000-0000-0000-0000-000000000228',
    'f0000000-0000-0000-0000-000000000001',
    'Which concept ensures cart consistency across multiple devices?',
    'RAM sync',
    'Server-side merge on login',
    'Local-only cart',
    'URL sharing',
    'b',
    'Merging local cart with server cart on login maintains consistency.',
    'hard', 'Offline', '{cart,sync,ecommerce}'
  ),
  (
    'e0000000-0000-0000-0000-000000000229',
    'f0000000-0000-0000-0000-000000000001',
    'Dart sound null safety prevents:',
    'Faster builds',
    'NullReferenceException at runtime',
    'More emojis in code',
    'Hot reload',
    'b',
    'Sound null safety catches null errors at compile time.',
    'hard', 'Dart', '{dart,null-safety}'
  ),
  (
    'e0000000-0000-0000-0000-000000000230',
    'f0000000-0000-0000-0000-000000000001',
    'YouTube video IDs can be embedded using:',
    'Mailto links',
    'iframe or YouTube player plugins',
    'SMS gateways',
    'SSH tunnels',
    'b',
    'YouTube videos are embedded via iframe or dedicated Flutter plugins.',
    'hard', 'Media', '{youtube,video,embed}'
  )
on conflict (id) do nothing;

--------------------------------------------------------------
-- 7. GRANTS
--------------------------------------------------------------
grant select on academy_courses to anon, authenticated;
grant select on academy_modules to anon, authenticated;
grant select on academy_lessons to anon, authenticated;
grant select on academy_quizzes to anon, authenticated;
grant select on academy_questions to anon, authenticated;

