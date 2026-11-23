---
title: Enumerations
summary: Give names to a fixed set of choices. Unscoped enum vs enum class, explicit values, underlying types, conversions, switching over enums, using enum, and printing them.
---

## The problem: magic numbers

Say a program tracks a traffic light. You could store its state as an `int`, with 0 for red, 1 for
yellow, and 2 for green:

```cpp
int light = 2;
if (light == 0) { /* stop */ }
light = 7;   // compiles happily, but what is light 7?
```

Nobody reading `light == 0` knows what 0 means, and nothing stops invalid values. An **enumeration**
(enum) is a type whose values are a fixed list of **named constants**:

```cpp
enum class Light { Red, Yellow, Green };
Light light = Light::Green;
if (light == Light::Red) { /* stop */ }   // reads like English
```

C++ has two kinds: the old **unscoped** `enum` (inherited from C), and the modern **scoped**
`enum class` (C++11). Use `enum class` by default; you need to know both.

## Unscoped enums

```cpp run
#include <iostream>

enum Color { Red, Green, Blue };   // Red = 0, Green = 1, Blue = 2

int main() {
    Color c = Green;              // enumerators are used without a prefix
    Color d = Color::Blue;        // the prefix is allowed too (since C++11)

    std::cout << c << ' ' << d << '\n';   // converts to int implicitly: prints numbers

    int asNumber = Red;           // implicit conversion to int
    std::cout << asNumber + 10 << '\n';

    if (c == 1) std::cout << "Green is 1\n";   // comparing with ints compiles
}
```

```output
1 2
10
Green is 1
```

Each **enumerator** (`Red`, `Green`, `Blue`) gets an integer value, counting up from 0. Unscoped enums
have two problems:

**1. Implicit conversion to int.** `c == 1` and `Red + 10` compile, so it's easy to mix up enums with
plain numbers, or with each other: comparing a `Color` with a `Fruit` compiles (with a warning).

**2. Name pollution.** The enumerator names leak into the surrounding scope. Two enums in the same scope
can't share an enumerator name, and they clash with variables and functions too:

```cpp compile-error
enum Color { Red, Green, Blue };
enum TrafficLight { Red, Yellow, Green };   // error: 'Red' conflicts with a previous declaration

int main() {}
```

That's why old C code uses prefixes like `COLOR_RED` and `LIGHT_RED`.

> **Note:** Converting an `int` *to* an unscoped enum is not implicit: `Color c = 1;` is an error.
> Only the enum-to-int direction is automatic.

## Scoped enums: `enum class`

`enum class` (or the equivalent `enum struct`) fixes both problems:

```cpp run
#include <iostream>

enum class Color { Red, Green, Blue };
enum class TrafficLight { Red, Yellow, Green };   // no clash: names are scoped

int main() {
    Color c = Color::Green;                    // the Color:: prefix is required
    TrafficLight t = TrafficLight::Red;

    if (c == Color::Green) std::cout << "green\n";
    if (t != TrafficLight::Green) std::cout << "not go\n";

    int n = static_cast<int>(c);               // conversion to int must be explicit
    std::cout << n << '\n';
}
```

```output
green
not go
1
```

Everything that was sloppy before is now a compile error:

```cpp compile-error
enum class Color { Red, Green, Blue };

int main() {
    Color c = Green;              // error: 'Green' was not declared in this scope
}
```

```cpp compile-error
enum class Color { Red, Green, Blue };

int main() {
    Color c = Color::Green;
    int n = c;                    // error: cannot convert 'Color' to 'int'
}
```

```cpp compile-error
enum class Color { Red, Green, Blue };
enum class Fruit { Apple, Banana };

int main() {
    bool same = (Color::Red == Fruit::Apple);   // error: no match for 'operator=='
}
```

This is called **strong typing**: a `Color` is a `Color`, not a number, and not a `Fruit`.

## Explicit values

You can choose the value of any enumerator. Enumerators without an explicit value continue counting
from the previous one:

```cpp run
#include <iostream>

enum class HttpStatus {
    Ok = 200,
    Created,            // 201
    NoContent = 204,
    NotFound = 404,
    Teapot = 418,
};

enum class Level { Low = 1, Medium = 5, High = 10, Default = Medium };   // values may repeat

int main() {
    std::cout << static_cast<int>(HttpStatus::Created) << '\n';
    std::cout << static_cast<int>(HttpStatus::NotFound) << '\n';
    std::cout << (Level::Default == Level::Medium) << '\n';
}
```

```output
201
404
1
```

A trailing comma after the last enumerator is allowed, which makes adding new ones a one-line change.

## The underlying type

Every enum is stored as some integer type, its **underlying type**. For `enum class` it's `int` unless
you say otherwise. You can pick a smaller (or bigger) type after a colon, which matters when you store
millions of them or match a file format:

```cpp run
#include <cstdint>
#include <iostream>

enum class Small : std::uint8_t { A, B, C };     // fits in one byte
enum class Big : long long { Huge = 1'000'000'000'000 };
enum class Normal { X, Y };                      // int by default
enum Flags : unsigned { None = 0, Bold = 1 };    // unscoped enums can specify it too

int main() {
    std::cout << sizeof(Small) << ' ' << sizeof(Big) << ' ' << sizeof(Normal) << '\n';
    std::cout << static_cast<long long>(Big::Huge) << '\n';
}
```

```output
1 8 4
1000000000000
```

## Converting with `static_cast`

Both directions use `static_cast`:

```cpp run
#include <iostream>

enum class Weekday { Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday };

int main() {
    Weekday d = Weekday::Friday;
    int index = static_cast<int>(d);              // enum -> int
    std::cout << index << '\n';

    Weekday next = static_cast<Weekday>(index + 1);   // int -> enum
    std::cout << (next == Weekday::Saturday) << '\n';
}
```

```output
4
1
```

> **Warning:** `static_cast<Weekday>(42)` compiles and doesn't check anything. You get a `Weekday` that
> matches none of the enumerators. When converting user input, validate the number first (as in
> `if (n >= 0 && n <= 6)`).

C++23 adds `std::to_underlying(e)` (in `<utility>`) as a shorter, type-safe way to get the number.

## Switching over enums

`switch` and enums are made for each other. Each `case` names an enumerator:

```cpp run
#include <iostream>

enum class Light { Red, Yellow, Green };

const char* action(Light l) {
    switch (l) {
        case Light::Red:    return "stop";
        case Light::Yellow: return "slow down";
        case Light::Green:  return "go";
    }
    return "unknown";   // needed: l could hold an invalid value
}

int main() {
    std::cout << action(Light::Red) << '\n';
    std::cout << action(Light::Green) << '\n';
}
```

```output
stop
go
```

Two good reasons to switch over enums without a `default:` label:

- With `-Wall`, the compiler **warns if you forget an enumerator** (`-Wswitch`: *"enumeration value
  'Yellow' not handled in switch"*). When you add a new enumerator later, the compiler points you to
  every switch that needs updating. A `default:` would silence that.
- The final `return` after the switch handles out-of-range values (and avoids a *"control reaches end of
  non-void function"* warning).

```cpp run warns
#include <iostream>

enum class Light { Red, Yellow, Green };

int main() {
    Light l = Light::Yellow;
    switch (l) {                     // warning: enumeration value 'Yellow' not handled in switch
        case Light::Red:   std::cout << "stop\n"; break;
        case Light::Green: std::cout << "go\n"; break;
    }
    std::cout << "done\n";
}
```

```output
done
```

### `using enum` (C++20)

Writing `Light::` in every case gets repetitive. C++20's `using enum` brings the enumerators of an
`enum class` into the current scope, just where you want them:

```cpp run
#include <iostream>

enum class Suit { Clubs, Diamonds, Hearts, Spades };

const char* color(Suit s) {
    switch (s) {
        using enum Suit;                  // only inside this switch
        case Clubs:
        case Spades:   return "black";    // two cases can share code
        case Diamonds:
        case Hearts:   return "red";
    }
    return "?";
}

int main() {
    std::cout << color(Suit::Hearts) << ' ' << color(Suit::Spades) << '\n';
}
```

```output
red black
```

You get the readability of unscoped names while keeping the strong typing everywhere else.

## Printing enums

`std::cout` doesn't know how to print an `enum class`, and an unscoped enum prints as a number. To
print names, write a function that maps each value to a string:

```cpp compile-error
#include <iostream>

enum class Color { Red, Green, Blue };

int main() {
    std::cout << Color::Red;   // error: no match for 'operator<<'
}
```

```cpp run
#include <iostream>
#include <string_view>

enum class Color { Red, Green, Blue };

std::string_view toString(Color c) {
    switch (c) {
        case Color::Red:   return "Red";
        case Color::Green: return "Green";
        case Color::Blue:  return "Blue";
    }
    return "Unknown";
}

int main() {
    Color c = Color::Blue;
    std::cout << "Color: " << toString(c) << '\n';

    // A lookup table also works when values are 0, 1, 2, ...
    constexpr const char* names[]{"Red", "Green", "Blue"};
    std::cout << names[static_cast<int>(Color::Green)] << '\n';
}
```

```output
Color: Blue
Green
```

The `switch` version is safer: the compiler warns when you add an enumerator and forget it there. (In the
operators module you'll see how to overload `operator<<` so that `std::cout << c` works directly.)

Reading an enum from input works the same way in reverse: read a string or number, then convert it with
`if`/`else` or `static_cast`.

:::quiz
Which of these compile, given `enum class Dir { Up, Down };`? (select all that apply)

- [ ] `Dir d = Up;`
- [x] `Dir d = Dir::Up;`
- [ ] `int n = Dir::Down;`
- [x] `int n = static_cast<int>(Dir::Down);`

Scoped enumerators must be qualified with `Dir::`, and converting to `int` requires an explicit cast.
:::

:::quiz
What is `static_cast<int>(Size::Large)`?

```cpp
enum class Size { Small = 10, Medium, Large = 20, Huge };
```

- [ ] `2`
- [ ] `12`
- [x] `20`
- [ ] `21`

`Large` has the explicit value 20. (`Medium` is 11 and `Huge` is 21.)
:::

:::quiz
Why is it often better to leave out `default:` when switching over an `enum class`?

- [ ] `default:` doesn't work with enums
- [x] Without it, the compiler warns when an enumerator isn't handled
- [ ] It makes the switch faster
- [ ] `default:` would run for every case

`-Wswitch` (part of `-Wall`) reports unhandled enumerators, but only if there's no `default:` to catch them.
:::

:::exercise Traffic light {easy}
Define `enum class Light { Red, Yellow, Green };`. Read the current light as a word and print the
**next** one in the cycle Red → Green → Yellow → Red.

Write three functions: `Light parse(const std::string& s)`, `Light next(Light l)` (using a `switch`),
and `std::string toString(Light l)`.

**Input:** one word: `Red`, `Yellow`, or `Green`.
**Output:** the next light's name, followed by a newline.

```cpp starter
#include <iostream>
#include <string>

enum class Light { Red, Yellow, Green };

int main() {
    std::string word;
    std::cin >> word;
    std::cout << word << '\n';
}
```

```cpp solution
#include <iostream>
#include <string>

enum class Light { Red, Yellow, Green };

Light parse(const std::string& s) {
    if (s == "Yellow") return Light::Yellow;
    if (s == "Green") return Light::Green;
    return Light::Red;
}

Light next(Light l) {
    switch (l) {
        case Light::Red:    return Light::Green;
        case Light::Green:  return Light::Yellow;
        case Light::Yellow: return Light::Red;
    }
    return Light::Red;
}

std::string toString(Light l) {
    switch (l) {
        case Light::Red:    return "Red";
        case Light::Yellow: return "Yellow";
        case Light::Green:  return "Green";
    }
    return "Unknown";
}

int main() {
    std::string word;
    std::cin >> word;
    std::cout << toString(next(parse(word))) << '\n';
}
```

```hint
`next` is a `switch (l)` with one `case Light::...: return ...;` per enumerator. Add a `return` after
the switch to keep the compiler happy.
```

```stdin
Red
```

```expected
Green
```

```stdin
Green
```

```expected
Yellow
```

```stdin
Yellow
```

```expected hidden
Red
```

```checks
must enum\s+class\s+Light :: Use enum class Light.
must switch\s*\( :: Use a switch in next().
must case\s+Light::\w+ :: Switch over the enumerators (case Light::Red: ...).
```
:::

:::exercise Weekday or weekend {easy}
Define `enum class Weekday { Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday };`.
Read a number, check that it's between 0 and 6, convert it to a `Weekday` with `static_cast`, and
print the day's name and whether it's a weekday or the weekend.

**Input:** one integer.
**Output:** `<Name> is a weekday` or `<Name> is on the weekend`, followed by a newline. If the number
is out of range, print `invalid day`.

Example: `5` prints `Saturday is on the weekend`.

```cpp starter
#include <iostream>
#include <string>

enum class Weekday { Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday };

int main() {
    int n;
    std::cin >> n;
    std::cout << "invalid day\n";
}
```

```cpp solution
#include <iostream>
#include <string>

enum class Weekday { Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday };

std::string name(Weekday d) {
    switch (d) {
        case Weekday::Monday:    return "Monday";
        case Weekday::Tuesday:   return "Tuesday";
        case Weekday::Wednesday: return "Wednesday";
        case Weekday::Thursday:  return "Thursday";
        case Weekday::Friday:    return "Friday";
        case Weekday::Saturday:  return "Saturday";
        case Weekday::Sunday:    return "Sunday";
    }
    return "?";
}

bool isWeekend(Weekday d) {
    return d == Weekday::Saturday || d == Weekday::Sunday;
}

int main() {
    int n;
    std::cin >> n;
    if (n < 0 || n > 6) {
        std::cout << "invalid day\n";
        return 0;
    }
    Weekday d = static_cast<Weekday>(n);
    std::cout << name(d) << (isWeekend(d) ? " is on the weekend" : " is a weekday") << '\n';
}
```

```hint
Validate first, then `Weekday d = static_cast<Weekday>(n);`. Monday is 0, so Saturday is 5 and Sunday is 6.
```

```stdin
5
```

```expected
Saturday is on the weekend
```

```stdin
0
```

```expected
Monday is a weekday
```

```stdin
6
```

```expected hidden
Sunday is on the weekend
```

```stdin
7
```

```expected hidden
invalid day
```

```stdin
-1
```

```expected hidden
invalid day
```

```checks
must static_cast\s*<\s*Weekday\s*> :: Convert the number with static_cast<Weekday>.
```
:::

:::exercise HTTP status names {easy}
Define a scoped enum with **explicit values** and the underlying type `int`:

```cpp
enum class HttpStatus : int { Ok = 200, Created = 201, BadRequest = 400, NotFound = 404, ServerError = 500 };
```

Read a status code number and print its name using a `switch` that uses **`using enum HttpStatus;`**
so the cases can be written without the prefix.

**Input:** one integer code.
**Output:** `<code> <Name>`, for example `404 NotFound`, followed by a newline. Codes that aren't in the
enum print `<code> Unknown`.

```cpp starter
#include <iostream>
#include <string>

int main() {
    int code;
    std::cin >> code;
    std::cout << code << " Unknown\n";
}
```

```cpp solution
#include <iostream>
#include <string>

enum class HttpStatus : int { Ok = 200, Created = 201, BadRequest = 400, NotFound = 404, ServerError = 500 };

std::string name(HttpStatus s) {
    switch (s) {
        using enum HttpStatus;
        case Ok:          return "Ok";
        case Created:     return "Created";
        case BadRequest:  return "BadRequest";
        case NotFound:    return "NotFound";
        case ServerError: return "ServerError";
    }
    return "Unknown";
}

int main() {
    int code;
    std::cin >> code;
    std::cout << code << ' ' << name(static_cast<HttpStatus>(code)) << '\n';
}
```

```hint
Converting any `int` with `static_cast<HttpStatus>(code)` is allowed; values that match no enumerator
simply fall through the switch to the final `return "Unknown";`.
```

```hint
Put `using enum HttpStatus;` as the first line inside `switch (s) { ... }`.
```

```stdin
404
```

```expected
404 NotFound
```

```stdin
201
```

```expected
201 Created
```

```stdin
500
```

```expected hidden
500 ServerError
```

```stdin
302
```

```expected hidden
302 Unknown
```

```stdin
400
```

```expected hidden
400 BadRequest
```

```stdin
-200
```

```expected hidden
-200 Unknown
```

```checks
must enum\s+class\s+HttpStatus\s*:\s*int :: Declare enum class HttpStatus : int.
must using\s+enum\s+HttpStatus :: Use using enum HttpStatus; in the switch.
must Ok\s*=\s*200 :: Give the enumerators explicit values (Ok = 200, ...).
```
:::

:::exercise Permission string {medium}
Unix file permissions are stored as bits: read = 4, write = 2, execute = 1. A digit like `5` (4 + 1)
means read and execute. Define:

```cpp
enum class Permission : unsigned char { Execute = 1, Write = 2, Read = 4 };
```

and a function `bool has(int bits, Permission p)` that checks whether the bit for `p` is set (use
`static_cast` and the bitwise `&` operator). Print the permission string in `rwx` style.

**Input:** one integer from 0 to 7.
**Output:** three characters: `r` or `-`, then `w` or `-`, then `x` or `-`, followed by a newline.

Example: `5` prints `r-x`; `0` prints `---`.

```cpp starter
#include <iostream>

enum class Permission : unsigned char { Execute = 1, Write = 2, Read = 4 };

int main() {
    int bits;
    std::cin >> bits;
    std::cout << "rwx\n";
}
```

```cpp solution
#include <iostream>

enum class Permission : unsigned char { Execute = 1, Write = 2, Read = 4 };

bool has(int bits, Permission p) {
    return (bits & static_cast<int>(p)) != 0;
}

int main() {
    int bits;
    std::cin >> bits;
    std::cout << (has(bits, Permission::Read) ? 'r' : '-')
              << (has(bits, Permission::Write) ? 'w' : '-')
              << (has(bits, Permission::Execute) ? 'x' : '-') << '\n';
}
```

```hint
`static_cast<int>(Permission::Read)` is 4. `bits & 4` is non-zero exactly when that bit is set.
```

```stdin
5
```

```expected
r-x
```

```stdin
7
```

```expected
rwx
```

```stdin
0
```

```expected hidden
---
```

```stdin
2
```

```expected hidden
-w-
```

```stdin
6
```

```expected hidden
rw-
```

```stdin
1
```

```expected hidden
--x
```

```checks
must enum\s+class\s+Permission\s*:\s*unsigned\s+char :: Keep enum class Permission : unsigned char.
must has\s*\(\s*\w+\s*,\s*Permission::Read\s*\) :: Check each permission with has(bits, Permission::Read) and friends.
must static_cast :: Convert the enumerator to a number with static_cast.
```
:::

:::exercise Robot walk {hard}
A robot starts at `(0, 0)` facing **North** on an endless grid (`x` grows to the East, `y` to the North).
It reads whitespace-separated commands until the input ends:

| Command | Effect |
| --- | --- |
| `L` | turn 90° left (North → West → South → East → North) |
| `R` | turn 90° right (North → East → South → West → North) |
| `F n` | move `n` steps forward in the direction it's facing |
| `B n` | move `n` steps backward, without turning |

Model the direction as `enum class Direction { North, East, South, West };`. Write
`Direction turnRight(Direction d)` and `Direction turnLeft(Direction d)` using `static_cast` and the
remainder operator, and `std::string_view name(Direction d)` using a `switch`. Track the position and
also the **farthest** Manhattan distance (`|x| + |y|`) from the origin that the robot ever reached.

**Input:** zero or more commands; each `n` is between 0 and 10^9, and there are at most 1000 commands
(so use `long long` for coordinates).
**Output:** two lines: `position <x> <y> facing <Direction>` and `farthest <distance>`.

Example: `F 2 R F 3 L L F 1` ends at `2 2` facing `West`, and the farthest point was `(3, 2)`, at
distance 5.

```cpp starter
#include <iostream>

enum class Direction { North, East, South, West };

int main() {
}
```

```cpp solution
#include <iostream>
#include <string>
#include <string_view>

enum class Direction { North, East, South, West };

Direction turnRight(Direction d) {
    return static_cast<Direction>((static_cast<int>(d) + 1) % 4);
}

Direction turnLeft(Direction d) {
    return static_cast<Direction>((static_cast<int>(d) + 3) % 4);   // +3 is -1, without going negative
}

std::string_view name(Direction d) {
    switch (d) {
        case Direction::North: return "North";
        case Direction::East:  return "East";
        case Direction::South: return "South";
        case Direction::West:  return "West";
    }
    return "?";
}

long long absolute(long long v) {
    return v < 0 ? -v : v;
}

int main() {
    Direction facing = Direction::North;
    long long x = 0;
    long long y = 0;
    long long farthest = 0;

    std::string command;
    while (std::cin >> command) {
        if (command == "L") {
            facing = turnLeft(facing);
        } else if (command == "R") {
            facing = turnRight(facing);
        } else {
            long long steps;
            std::cin >> steps;
            if (command == "B") {
                steps = -steps;
            }
            switch (facing) {
                case Direction::North: y += steps; break;
                case Direction::East:  x += steps; break;
                case Direction::South: y -= steps; break;
                case Direction::West:  x -= steps; break;
            }
            // the distance along a straight move is largest at one of its ends
            long long distance = absolute(x) + absolute(y);
            if (distance > farthest) {
                farthest = distance;
            }
        }
    }
    std::cout << "position " << x << ' ' << y << " facing " << name(facing) << '\n';
    std::cout << "farthest " << farthest << '\n';
}
```

```hint
The enumerators are 0, 1, 2, 3 in clockwise order, so turning right is "add 1, wrap around with `% 4`".
Turning left is "subtract 1", but `-1 % 4` is `-1` in C++: add 3 instead.
```

```hint
Moving backward is moving forward by `-n`. A `switch` over the direction decides whether to change `x`
or `y`, and with which sign.
```

```hint
Since the robot moves in straight lines, the farthest point of any move is its start or its end, so
checking the distance after every move is enough. `2 * 10^9` doesn't fit in an `int`.
```

```stdin
F 2 R F 3 L L F 1
```

```expected
position 2 2 facing West
farthest 5
```

```stdin
L F 5 B 2 R R R
```

```expected
position -3 0 facing South
farthest 5
```

```stdin
```

```expected hidden
position 0 0 facing North
farthest 0
```

```stdin
L L L L L F 0
```

```expected hidden
position 0 0 facing West
farthest 0
```

```stdin
F 1000000000 R F 1000000000 R F 1000000000 R F 1000000000 R F 1000000000
```

```expected hidden
position 0 1000000000 facing North
farthest 2000000000
```

```stdin
R B 7 L B 3
```

```expected hidden
position -7 -3 facing North
farthest 10
```

```checks
must enum\s+class\s+Direction :: Use enum class Direction.
must Direction\s+turnLeft\s*\(\s*Direction :: Write Direction turnLeft(Direction d).
must Direction\s+turnRight\s*\(\s*Direction :: Write Direction turnRight(Direction d).
must static_cast\s*<\s*Direction\s*> :: Convert back to the enum with static_cast<Direction>.
must switch\s*\( :: Use a switch over the direction.
```
:::
