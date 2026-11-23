---
title: Structs
summary: Group related data into your own types. Defining structs, initializing them (aggregate, designated, default members), the dot and arrow operators, nesting, and passing and comparing structs.
---

## Why structs?

Suppose a program tracks students. With what you know so far, you'd need separate variables for each
piece of data:

```cpp
std::string name1 = "Ada";   int score1 = 95;
std::string name2 = "Linus"; int score2 = 87;
// or "parallel vectors": names[i] and scores[i] belong together... hopefully
```

That's fragile: nothing ties a name to its score, and a function that wants "a student" needs a
parameter for every piece. A **struct** bundles related variables into **one new type**:

```cpp
struct Student {
    std::string name;
    int score;
};
```

Now `Student` is a type just like `int` or `std::string`. You can make variables of it, put it in
vectors, pass it to functions, and return it.

## Defining a struct

```cpp
struct Point {      // 'struct', then the name of the new type
    double x;       // members (also called fields or data members)
    double y;
};                  // <-- the semicolon is required!
```

- The variables inside are **members**. Each has a type and a name.
- A struct definition is usually placed **outside** functions (often in a header file), so the whole
  program can use it.
- The closing `};` needs its semicolon. Forgetting it is a classic error. GCC spells it out, but some
  compilers report a confusing error on the *next* line instead:

```cpp compile-error
struct Point {
    double x;
    double y;
}            // error: expected ';' after struct definition

int main() {}
```

By convention, type names start with an uppercase letter (`Point`, `Student`), which makes them easy to
tell apart from variables.

## Creating objects and accessing members

A variable of a struct type is called an **object** (or *instance*). Use the **dot operator** `.` to
reach its members:

```cpp run
#include <iostream>
#include <string>

struct Student {
    std::string name;
    int score;
};

int main() {
    Student s;              // create a Student object
    s.name = "Ada";         // assign each member
    s.score = 95;

    std::cout << s.name << " scored " << s.score << '\n';

    s.score += 3;           // members are ordinary variables
    std::cout << s.name << " now has " << s.score << '\n';
}
```

```output
Ada scored 95
Ada now has 98
```

> **Warning:** `Student s;` leaves `score` **uninitialized** (it's an `int`, and plain local `int`s
> start with garbage). `name` is fine, because `std::string` always initializes itself to empty. Reading
> `s.score` before assigning it is undefined behavior. Initialize your objects, as shown next.

## Initialization: every way to do it

### Aggregate initialization

A simple struct like `Student` is an **aggregate** (no constructors, all members public). You can
initialize it with braces, listing the members **in declaration order**:

```cpp run
#include <iostream>
#include <string>

struct Student {
    std::string name;
    int score;
};

int main() {
    Student a{"Ada", 95};          // brace initialization
    Student b = {"Linus", 87};     // with '=': same result
    Student c{};                   // all members value-initialized: "" and 0

    std::cout << a.name << ' ' << a.score << '\n';
    std::cout << b.name << ' ' << b.score << '\n';
    std::cout << '[' << c.name << "] " << c.score << '\n';
}
```

```output
Ada 95
Linus 87
[] 0
```

If you give **fewer** values than members, the rest are value-initialized (zero, empty). It works, but
GCC's `-Wextra` warns about it ("missing initializer for member"), because it's often a mistake. Give
every member a value, or use `{}` for all of them, or use default member initializers (below).

Giving **more** values than members, or values of the wrong type, is an error. Brace initialization also
refuses **narrowing** conversions, such as a `double` into an `int` member:

```cpp compile-error
struct Student {
    const char* name;
    int score;
};

int main() {
    Student s{"Ada", 95.5};   // error: narrowing conversion of '95.5' from 'double' to 'int'
}
```

### Designated initializers (C++20)

Listing values by position gets confusing with many members. C++20 lets you **name** them:

```cpp run
#include <iostream>

struct Window {
    int width;
    int height;
    bool resizable;
};

int main() {
    Window w{.width = 800, .height = 600, .resizable = true};
    Window v = {.width = 320, .height = 240, .resizable = false};

    std::cout << w.width << 'x' << w.height << ' ' << w.resizable << '\n';
    std::cout << v.width << 'x' << v.height << ' ' << v.resizable << '\n';
}
```

```output
800x600 1
320x240 0
```

The rules: the designators must appear **in the same order** as the members are declared, you can't
mix designated and positional values, and each member can be named only once:

```cpp compile-error
struct Window {
    int width;
    int height;
};

int main() {
    Window w{.height = 600, .width = 800};   // error: order doesn't match the declaration
}
```

### Default member initializers

You can give members a default value right in the struct. Any member you don't explicitly initialize
gets its default instead of garbage:

```cpp run
#include <iostream>
#include <string>

struct Player {
    std::string name = "Anonymous";
    int health = 100;
    int level = 1;
};

int main() {
    Player a;                          // all defaults, even without braces
    Player b{"Zelda"};                 // name given, the rest use defaults
    Player c{.name = "Link", .level = 5};   // skip health: it keeps its default

    std::cout << a.name << ' ' << a.health << ' ' << a.level << '\n';
    std::cout << b.name << ' ' << b.health << ' ' << b.level << '\n';
    std::cout << c.name << ' ' << c.health << ' ' << c.level << '\n';
}
```

```output
Anonymous 100 1
Zelda 100 1
Link 100 5
```

This is the cleanest way to make sure a struct is never uninitialized. A good habit: **give every
member of a fundamental type (`int`, `double`, `bool`, pointers) a default.**

## Copying structs

Assigning or initializing one struct from another **copies every member**. The two objects are then
independent:

```cpp run
#include <iostream>

struct Point {
    int x = 0;
    int y = 0;
};

int main() {
    Point a{1, 2};
    Point b = a;      // copy
    b.x = 100;        // changes only b

    std::cout << a.x << ',' << a.y << '\n';
    std::cout << b.x << ',' << b.y << '\n';
}
```

```output
1,2
100,2
```

## Pointers to structs: the arrow operator `->`

With a pointer to a struct, you could dereference and then use the dot: `(*p).x`. The parentheses are
needed because `.` binds tighter than `*`. That's so common and so ugly that C++ has a shortcut,
the **arrow operator**: `p->x` means `(*p).x`.

```cpp run
#include <iostream>
#include <memory>

struct Point {
    int x = 0;
    int y = 0;
};

int main() {
    Point pt{3, 4};
    Point* p = &pt;

    std::cout << (*p).x << ' ' << p->x << '\n';   // the same thing

    p->y = 40;                                    // modify through the pointer
    std::cout << pt.y << '\n';

    auto owned = std::make_unique<Point>(Point{7, 8});
    owned->x += 1;                                // smart pointers support -> too
    std::cout << owned->x << ' ' << owned->y << '\n';
}
```

```output
3 3
40
8 8
```

Rule: **`.` on an object, `->` on a pointer.** Mixing them up gives errors like
*"request for member 'x' in 'p', which is of pointer type 'Point\*' (maybe you meant to use '->' ?)"*:

```cpp compile-error
struct Point {
    int x = 0;
    int y = 0;
};

int main() {
    Point pt;
    Point* p = &pt;
    p.x = 5;     // error: p is a pointer, use p->x
}
```

## Nested structs

A member can itself be a struct. Chain the dots to reach inner members:

```cpp run
#include <iostream>
#include <string>

struct Point {
    int x = 0;
    int y = 0;
};

struct Rect {
    Point topLeft;
    Point bottomRight;
};

struct Shape {
    std::string label;
    Rect bounds;
};

int main() {
    Rect r{{0, 0}, {10, 5}};                         // nested braces, in order
    Shape s{"button", {{2, 3}, {8, 6}}};
    Shape t{.label = "panel", .bounds = {.topLeft = {1, 1}, .bottomRight = {9, 9}}};

    int width = r.bottomRight.x - r.topLeft.x;
    std::cout << "width " << width << '\n';
    std::cout << s.label << " starts at " << s.bounds.topLeft.x << ',' << s.bounds.topLeft.y << '\n';
    std::cout << t.label << " ends at " << t.bounds.bottomRight.x << '\n';
}
```

```output
width 10
button starts at 2,3
panel ends at 9
```

## Arrays and vectors of structs

Structs combine naturally with containers. This is how you'll store most real data:

```cpp run
#include <iostream>
#include <string>
#include <vector>

struct Student {
    std::string name;
    int score = 0;
};

int main() {
    std::vector<Student> students{
        {"Ada", 95},
        {"Linus", 87},
    };
    students.push_back({"Grace", 91});          // braces create a Student
    students.push_back(Student{"Alan", 78});    // or name the type explicitly

    int total = 0;
    for (const Student& s : students) {         // const& avoids copying each Student
        std::cout << s.name << ": " << s.score << '\n';
        total += s.score;
    }
    std::cout << "average: " << total / static_cast<double>(students.size()) << '\n';

    students[1].score += 5;                     // index, then dot
    std::cout << students[1].name << " now " << students[1].score << '\n';

    Student podium[3]{{"A", 3}, {"B", 2}, {"C", 1}};   // a C array of structs works too
    std::cout << podium[0].name << '\n';
}
```

```output
Ada: 95
Linus: 87
Grace: 91
Alan: 78
average: 87.75
Linus now 92
A
```

## Passing structs to functions

Structs are passed like any other type. The usual rules apply:

```cpp run
#include <iostream>
#include <string>

struct Student {
    std::string name;
    int score = 0;
};

// Read-only: pass by const reference (no copy, can't modify)
void print(const Student& s) {
    std::cout << s.name << " (" << s.score << ")\n";
}

// Modify the caller's object: pass by reference
void addBonus(Student& s, int bonus) {
    s.score += bonus;
}

// Build and return a new object: return by value
Student makeStudent(const std::string& name) {
    return {name, 50};       // braces are converted to the return type
}

int main() {
    Student s = makeStudent("Ada");
    print(s);
    addBonus(s, 10);
    print(s);
}
```

```output
Ada (50)
Ada (60)
```

Passing by **value** (`void print(Student s)`) also works, but it copies every member, including the
string. For anything bigger than a couple of `int`s, prefer `const&`.

Returning a struct is the cleanest way to return **several values** from one function:

```cpp
struct Range { int lo; int hi; };

Range bounds(const std::vector<int>& v);   // returns both the min and the max
```

## Comparing structs

The compiler doesn't know what "equal" means for your type, so `==` doesn't work out of the box:

```cpp compile-error
struct Point {
    int x = 0;
    int y = 0;
};

int main() {
    Point a{1, 2};
    Point b{1, 2};
    bool same = (a == b);   // error: no match for 'operator==' (operand types are 'Point' and 'Point')
}
```

You can compare members yourself (`a.x == b.x && a.y == b.y`), but C++20 can generate the comparison
for you: declare a **defaulted `operator==`** inside the struct, and it compares all members in order.
(The `operator==` syntax is explained in the operator overloading lesson; for now just copy the line.)

```cpp run
#include <iostream>

struct Point {
    int x = 0;
    int y = 0;

    bool operator==(const Point&) const = default;   // C++20: compare member by member
};

int main() {
    Point a{1, 2};
    Point b{1, 2};
    Point c{2, 1};

    std::cout << (a == b) << ' ' << (a == c) << ' ' << (a != c) << '\n';  // != comes for free
}
```

```output
1 0 1
```

Similarly, `auto operator<=>(const Point&) const = default;` (the "spaceship operator", from `<compare>`)
generates `<`, `<=`, `>`, `>=` too, comparing members in order like a dictionary.

> **Note:** A `struct` can also contain **member functions**, constructors, and private members. At that
> point it's really a class, and in C++ the only difference between `struct` and `class` is whether
> members are public by default. You'll learn all of that in the classes module. A common convention:
> use `struct` for plain bundles of data, like everything in this lesson.

:::quiz
Given `struct P { int x; int y; };` and `P* ptr = &p;`, which expressions read `x` correctly? (select all that apply)

- [x] `ptr->x`
- [x] `(*ptr).x`
- [ ] `*ptr.x`
- [ ] `ptr.x`

`ptr->x` is shorthand for `(*ptr).x`. Without parentheses, `*ptr.x` parses as `*(ptr.x)`, which is an
error, and `ptr.x` uses a dot on a pointer.
:::

:::quiz
What does this print?

```cpp
struct Config {
    int width = 640;
    int height = 480;
    bool fullscreen = false;
};
Config c{.height = 1080};
std::cout << c.width << ' ' << c.height << ' ' << c.fullscreen;
```

- [ ] `0 1080 0`
- [x] `640 1080 0`
- [ ] `1080 480 0`
- [ ] It doesn't compile

Members not mentioned in the designated initializer keep their default member initializers.
:::

:::exercise Manhattan distance
Define `struct Point { int x; int y; };` and a function `int manhattan(const Point& a, const Point& b)`
that returns `|a.x - b.x| + |a.y - b.y|` (the distance a taxi drives on a grid).

**Input:** four integers `x1 y1 x2 y2`.
**Output:** the Manhattan distance between `(x1, y1)` and `(x2, y2)`, followed by a newline.

```cpp starter
#include <iostream>

// define struct Point here

int main() {
    int x1, y1, x2, y2;
    std::cin >> x1 >> y1 >> x2 >> y2;
    std::cout << 0 << '\n';
}
```

```cpp solution
#include <cstdlib>
#include <iostream>

struct Point {
    int x;
    int y;
};

int manhattan(const Point& a, const Point& b) {
    return std::abs(a.x - b.x) + std::abs(a.y - b.y);
}

int main() {
    int x1, y1, x2, y2;
    std::cin >> x1 >> y1 >> x2 >> y2;
    Point p{x1, y1};
    Point q{x2, y2};
    std::cout << manhattan(p, q) << '\n';
}
```

```hint
Create the points with `Point p{x1, y1};` and access members with `p.x`, `p.y`.
```

```hint
`std::abs` (from `<cstdlib>`) gives the absolute value of an `int`.
```

```stdin
1 2 4 6
```

```expected
7
```

```stdin
3 3 3 3
```

```expected
0
```

```stdin
-5 10 5 -10
```

```expected hidden
30
```

```checks
must struct\s+Point :: Define struct Point.
must manhattan\s*\(\s*const\s+Point\s*&\s*\w+\s*,\s*const\s+Point\s*&\s*\w+\s*\) :: Write int manhattan(const Point& a, const Point& b).
```
:::

:::exercise Top student
Define a struct `Student` with a `std::string name` and an `int score`. Read `n` students into a
`std::vector<Student>`, then print the one with the **highest** score. If several share the highest
score, print the one that came **first**.

**Input:** `n` (at least 1), then `n` lines of `name score` (names have no spaces).
**Output:** `<name> <score>`, followed by a newline.

```cpp starter
#include <iostream>
#include <string>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::string name;
    int score;
    std::cin >> name >> score;
    std::cout << name << ' ' << score << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>
#include <vector>

struct Student {
    std::string name;
    int score = 0;
};

int main() {
    int n;
    std::cin >> n;
    std::vector<Student> students;
    for (int i = 0; i < n; ++i) {
        Student s;
        std::cin >> s.name >> s.score;
        students.push_back(s);
    }

    const Student* best = &students[0];
    for (const Student& s : students) {
        if (s.score > best->score) {
            best = &s;
        }
    }
    std::cout << best->name << ' ' << best->score << '\n';
}
```

```hint
Read directly into the members: `Student s; std::cin >> s.name >> s.score; students.push_back(s);`
```

```hint
Track the best one by index or by pointer. Only replace it when the score is **strictly** greater, so
ties keep the first.
```

```stdin
3
Ada 95
Linus 87
Grace 99
```

```expected
Grace 99
```

```stdin
1
Solo 0
```

```expected
Solo 0
```

```stdin
4
Bob 70
Ann 90
Cid 90
Dee 85
```

```expected hidden
Ann 90
```

```checks
must struct\s+Student :: Define struct Student.
must std::vector\s*<\s*Student\s*> :: Store the students in a std::vector<Student>.
```
:::

:::exercise Scale a rectangle
Define `struct Rect { int width = 0; int height = 0; };` and write `void scale(Rect* r, int factor)`
that multiplies both dimensions **through the pointer**, using the arrow operator. Also write
`int area(const Rect& r)`.

**Input:** `width height factor`.
**Output:** `<width>x<height> area=<area>` for the **scaled** rectangle, followed by a newline.

Example: `3 4 2` prints `6x8 area=48`.

```cpp starter
#include <iostream>

struct Rect {
    int width = 0;
    int height = 0;
};

void scale(Rect* r, int factor) {
    // multiply r's width and height by factor
}

int main() {
    Rect r;
    int factor;
    std::cin >> r.width >> r.height >> factor;
    scale(&r, factor);
    std::cout << r.width << 'x' << r.height << '\n';
}
```

```cpp solution
#include <iostream>

struct Rect {
    int width = 0;
    int height = 0;
};

void scale(Rect* r, int factor) {
    r->width *= factor;
    r->height *= factor;
}

int area(const Rect& r) {
    return r.width * r.height;
}

int main() {
    Rect r;
    int factor;
    std::cin >> r.width >> r.height >> factor;
    scale(&r, factor);
    std::cout << r.width << 'x' << r.height << " area=" << area(r) << '\n';
}
```

```hint
Inside `scale`, `r` is a pointer, so write `r->width *= factor;`.
```

```stdin
3 4 2
```

```expected
6x8 area=48
```

```stdin
5 7 1
```

```expected
5x7 area=35
```

```stdin
9 3 0
```

```expected hidden
0x0 area=0
```

```checks
must ->\s*width :: Modify the width through the pointer with r->width.
must ->\s*height :: Modify the height through the pointer with r->height.
must int\s+area\s*\(\s*const\s+Rect\s*& :: Write int area(const Rect& r).
```
:::

:::exercise Count matching points
Define `struct Point { int x = 0; int y = 0; };` with a **defaulted `operator==`** (C++20). Read a target
point, then `n` more points, and count how many are equal to the target using `==` on whole `Point`s.

**Input:** `tx ty`, then `n`, then `n` lines of `x y`.
**Output:** the count, followed by a newline.

```cpp starter
#include <iostream>

struct Point {
    int x = 0;
    int y = 0;
};

int main() {
    Point target;
    std::cin >> target.x >> target.y;
    int n;
    std::cin >> n;
    int count = 0;
    for (int i = 0; i < n; ++i) {
        Point p;
        std::cin >> p.x >> p.y;
        if (p.x == target.x) ++count;
    }
    std::cout << count << '\n';
}
```

```cpp solution
#include <iostream>

struct Point {
    int x = 0;
    int y = 0;

    bool operator==(const Point&) const = default;
};

int main() {
    Point target;
    std::cin >> target.x >> target.y;
    int n;
    std::cin >> n;
    int count = 0;
    for (int i = 0; i < n; ++i) {
        Point p;
        std::cin >> p.x >> p.y;
        if (p == target) ++count;
    }
    std::cout << count << '\n';
}
```

```hint
Add `bool operator==(const Point&) const = default;` inside the struct. Then `p == target` compares
both members.
```

```stdin
1 2
4
1 2
1 3
2 2
1 2
```

```expected
2
```

```stdin
0 0
0
```

```expected
0
```

```stdin
5 -5
3
5 -5
5 -5
5 -5
```

```expected hidden
3
```

```checks
must operator==\s*\([^)]*\)\s*const\s*=\s*default :: Declare bool operator==(const Point&) const = default; in the struct.
must \w+\s*==\s*target|target\s*==\s*\w+ :: Compare whole points with ==.
```
:::
