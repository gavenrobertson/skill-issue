---
title: "Structs, Enums & Compound Types: Challenges"
summary: Hard, realistic programs that model data with structs, enum class, std::optional and friends - an inventory, a gradebook, a vending-machine state machine, and a date calculator.
---

These problems are meant to be **hard**. They're small but complete programs, the kind you'd actually
write: you choose how to model the data with structs and enums, which functions to write, and how to
handle every edge case in the specification. The starters only contain an empty `main`.

Read each spec twice, design your types first, and test the odd cases yourself (empty input, unknown
names, boundaries like leap days). Try hard before peeking at the hints: the struggle is the practice.
You can use everything from this module and the earlier ones, including `std::vector`, `std::string`,
`std::string_view` and `<iomanip>`.

:::quiz
On this site's compiler, what does this print?

```cpp
struct S { char c; int i; char d; };
struct T { int i; char c; char d; };
enum class E : char { A = 'a', B, C };

std::cout << sizeof(S) << ' ' << sizeof(T) << ' ' << static_cast<char>(E::C);
```

- [ ] `6 6 c`
- [ ] `12 12 c`
- [x] `12 8 c`
- [ ] `12 8 2`

`S` needs 3 padding bytes before `i` and 3 after `d` (its size must be a multiple of 4): 12. In `T` the
two `char`s share the last 4-byte slot: 8. `A` is `'a'`, so `B` is `'b'` and `C` is `'c'`, and casting
to `char` prints the character.
:::

:::quiz
What does this print?

```cpp
std::optional<int> a = 0;
std::optional<int> b;
std::variant<bool, std::string> v = "hi";
std::cout << bool(a) << (b < a) << v.index() << b.value_or(7);
```

- [ ] `0107`
- [ ] `1007`
- [x] `1117`
- [ ] `1110`

`bool(a)` asks whether `a` **has** a value (it does, the value 0). An empty optional compares less than
any value. Since C++20, a string literal initializes the `std::string` alternative of the variant
(index 1) rather than converting to `bool`. And `b` is empty, so `value_or` gives 7.
:::

:::exercise Inventory manager {hard}
Write the stock-keeping part of a small shop. Model it with

```cpp
enum class Category { Food, Tool, Toy };

struct Item {
    std::string name;
    Category category = Category::Food;
    long long quantity = 0;
    long long priceCents = 0;    // money is stored in cents to avoid rounding errors
};
```

and keep the items in a `std::vector<Item>`. Write at least `std::optional<Category> parseCategory(...)`
(empty for an unknown category word) and `std::optional<std::size_t> findItem(...)` (the item's index,
or empty). Then process commands until the input ends:

| Command | Effect |
| --- | --- |
| `add NAME CATEGORY QTY PRICE` | add a new item; `CATEGORY` is `food`, `tool` or `toy`, `PRICE` is in cents |
| `restock NAME QTY` | add `QTY` units to the item |
| `sell NAME QTY` | remove `QTY` units and add `QTY * price` to the shop's revenue |
| `find NAME` | print `NAME (Category) QTY x $PRICE`, for example `apple (Food) 7 x $0.50` |
| `report` | for each category in the order Food, Tool, Toy, print `Category: U units worth $V` (the total quantity and total value of its items), then `revenue: $R` |

Errors print a line and change nothing: `error: bad category` (checked first), then
`error: duplicate NAME` when adding an existing name; `error: unknown NAME` for `restock`, `sell` and
`find` of a missing item; and `error: only N left` when selling more than the stock. Names are
case-sensitive single words. Money is printed as dollars with exactly two decimals: 5 cents is `$0.05`.

**Input:** commands; quantities and prices are between 0 and 10^6.
**Output:** one line per `find`, per error, and the lines of each `report`.

```cpp starter
#include <iostream>

int main() {
}
```

```cpp solution
#include <iostream>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

enum class Category { Food, Tool, Toy };

struct Item {
    std::string name;
    Category category = Category::Food;
    long long quantity = 0;
    long long priceCents = 0;
};

std::optional<Category> parseCategory(const std::string& word) {
    if (word == "food") return Category::Food;
    if (word == "tool") return Category::Tool;
    if (word == "toy") return Category::Toy;
    return std::nullopt;
}

std::string_view categoryName(Category c) {
    switch (c) {
        case Category::Food: return "Food";
        case Category::Tool: return "Tool";
        case Category::Toy:  return "Toy";
    }
    return "?";
}

std::optional<std::size_t> findItem(const std::vector<Item>& items, const std::string& name) {
    for (std::size_t i = 0; i < items.size(); ++i) {
        if (items[i].name == name) {
            return i;
        }
    }
    return std::nullopt;
}

std::string money(long long cents) {
    std::string fraction = std::to_string(cents % 100);
    if (fraction.size() < 2) {
        fraction = "0" + fraction;                 // 5 cents -> "05"
    }
    return "$" + std::to_string(cents / 100) + "." + fraction;
}

int main() {
    std::vector<Item> items;
    long long revenue = 0;

    std::string command;
    while (std::cin >> command) {
        if (command == "add") {
            std::string name, word;
            long long quantity, price;
            std::cin >> name >> word >> quantity >> price;
            std::optional<Category> category = parseCategory(word);
            if (!category) {
                std::cout << "error: bad category\n";
            } else if (findItem(items, name)) {   // has a value, even if the index is 0
                std::cout << "error: duplicate " << name << '\n';
            } else {
                items.push_back({name, *category, quantity, price});
            }
        } else if (command == "restock" || command == "sell" || command == "find") {
            std::string name;
            std::cin >> name;
            long long quantity = 0;
            if (command != "find") {
                std::cin >> quantity;
            }
            std::optional<std::size_t> index = findItem(items, name);
            if (!index) {
                std::cout << "error: unknown " << name << '\n';
                continue;
            }
            Item& item = items[*index];
            if (command == "restock") {
                item.quantity += quantity;
            } else if (command == "find") {
                std::cout << item.name << " (" << categoryName(item.category) << ") " << item.quantity
                          << " x " << money(item.priceCents) << '\n';
            } else if (item.quantity < quantity) {
                std::cout << "error: only " << item.quantity << " left\n";
            } else {
                item.quantity -= quantity;
                revenue += quantity * item.priceCents;
            }
        } else if (command == "report") {
            for (Category c : {Category::Food, Category::Tool, Category::Toy}) {
                long long units = 0;
                long long value = 0;
                for (const Item& item : items) {
                    if (item.category == c) {
                        units += item.quantity;
                        value += item.quantity * item.priceCents;
                    }
                }
                std::cout << categoryName(c) << ": " << units << " units worth " << money(value) << '\n';
            }
            std::cout << "revenue: " << money(revenue) << '\n';
        }
    }
}
```

```hint
Keep all money in `long long` cents and only convert when printing: dollars are `cents / 100`, and the
cents part `cents % 100` needs a leading zero when it's a single digit.
```

```hint
`findItem` returning `std::optional<std::size_t>` lets `if (findItem(items, name))` mean "it exists",
even when the index is 0. Then `items[*index]` is the item; take it by reference (`Item& item`) to change it.
```

```hint
For `report`, loop over the three categories (`for (Category c : {Category::Food, Category::Tool,
Category::Toy})`) and add up the items of each one. A category with no items still prints a line.
```

```stdin
add apple food 10 50
add hammer tool 2 1599
sell apple 3
find apple
find hammer
report
```

```expected
apple (Food) 7 x $0.50
hammer (Tool) 2 x $15.99
Food: 7 units worth $3.50
Tool: 2 units worth $31.98
Toy: 0 units worth $0.00
revenue: $1.50
```

```stdin
add kite toy 1 999
add kite toy 5 100
add drill tools 1 5000
sell kite 2
sell ball 1
restock ball 3
find drill
restock kite 4
sell kite 5
report
```

```expected
error: duplicate kite
error: bad category
error: only 1 left
error: unknown ball
error: unknown ball
error: unknown drill
Food: 0 units worth $0.00
Tool: 0 units worth $0.00
Toy: 0 units worth $0.00
revenue: $49.95
```

```stdin
```

```expected hidden
```

```stdin
add gold tool 1000000 1000000
sell gold 999999
add gum food 3 5
add yoyo toy 0 105
find gum
find yoyo
report
```

```expected hidden
gum (Food) 3 x $0.05
yoyo (Toy) 0 x $1.05
Food: 3 units worth $0.15
Tool: 1 units worth $10000.00
Toy: 0 units worth $0.00
revenue: $9999990000.00
```

```stdin
add x toyz 1 1
add x toy 1 1
add x food 1 1
find X
sell x 0
restock x 2
find x
report
```

```expected hidden
error: bad category
error: duplicate x
error: unknown X
x (Toy) 3 x $0.01
Food: 0 units worth $0.00
Tool: 0 units worth $0.00
Toy: 3 units worth $0.03
revenue: $0.00
```

```checks
must enum\s+class\s+Category :: Model the categories with an enum class.
must struct\s+Item :: Model an item with a struct.
must std::optional :: Use std::optional for lookups that can fail.
```
:::

:::exercise Gradebook {hard}
Each input line records one assignment for one student: `NAME SCORE`, where `SCORE` is an integer from
0 to 100 or the word `absent`. A student can appear on many lines. Produce a report card.

Model each student with a struct (name, sum of scores, number of scores, number of absences), and the
letter grades with `enum class Grade { A, B, C, D, F };`. Write
`std::optional<double> average(const Student& s)` (empty if the student has no scores at all) and
`Grade toGrade(double average)`: `A` for 90 and up, `B` for 80 and up, `C` for 70 and up, `D` for 60 and
up, otherwise `F` (use the exact average, not the rounded one).

**Input:** zero or more lines `NAME SCORE`.
**Output:** first one line per student, in the order they first appear:
`NAME: avg=<average with 1 decimal> grade=<letter> absences=<count>`, or
`NAME: no scores absences=<count>` if the student has no scores. Then two summary lines:
`best: NAME` (the highest average; on a tie the student who appeared first; `none` if nobody has a
score) and `grades: A=<n> B=<n> C=<n> D=<n> F=<n>` counting the students with scores.

```cpp starter
#include <iostream>

int main() {
}
```

```cpp solution
#include <iomanip>
#include <iostream>
#include <optional>
#include <string>
#include <vector>

enum class Grade { A, B, C, D, F };

struct Student {
    std::string name;
    int total = 0;
    int count = 0;
    int absences = 0;
};

std::optional<double> average(const Student& s) {
    if (s.count == 0) {
        return std::nullopt;
    }
    return static_cast<double>(s.total) / s.count;
}

Grade toGrade(double avg) {
    if (avg >= 90) return Grade::A;
    if (avg >= 80) return Grade::B;
    if (avg >= 70) return Grade::C;
    if (avg >= 60) return Grade::D;
    return Grade::F;
}

char letter(Grade g) {
    switch (g) {
        case Grade::A: return 'A';
        case Grade::B: return 'B';
        case Grade::C: return 'C';
        case Grade::D: return 'D';
        case Grade::F: return 'F';
    }
    return '?';
}

int main() {
    std::vector<Student> students;
    std::string name, score;
    while (std::cin >> name >> score) {
        std::size_t i = 0;
        while (i < students.size() && students[i].name != name) {
            ++i;
        }
        if (i == students.size()) {
            Student fresh;
            fresh.name = name;
            students.push_back(fresh);
        }
        Student& s = students[i];
        if (score == "absent") {
            ++s.absences;
        } else {
            s.total += std::stoi(score);
            ++s.count;
        }
    }

    int counts[5]{};                            // indexed by static_cast<int>(Grade)
    const Student* best = nullptr;
    std::cout << std::fixed << std::setprecision(1);
    for (const Student& s : students) {
        std::optional<double> avg = average(s);
        if (!avg) {
            std::cout << s.name << ": no scores absences=" << s.absences << '\n';
            continue;
        }
        Grade g = toGrade(*avg);
        ++counts[static_cast<int>(g)];
        std::cout << s.name << ": avg=" << *avg << " grade=" << letter(g) << " absences=" << s.absences << '\n';
        if (best == nullptr || *avg > *average(*best)) {
            best = &s;
        }
    }
    std::cout << "best: " << (best ? best->name : "none") << '\n';
    std::cout << "grades: A=" << counts[0] << " B=" << counts[1] << " C=" << counts[2]
              << " D=" << counts[3] << " F=" << counts[4] << '\n';
}
```

```hint
Read each line as two strings, `name` and `score`. If `score` isn't `absent`, convert it with `std::stoi`.
Find the student with a linear search over a `std::vector<Student>`, adding them the first time.
```

```hint
Print with `std::fixed << std::setprecision(1)` (from `<iomanip>`). The grade uses the unrounded
average: 89.5 prints as `89.5` and is a `B`.
```

```hint
The enumerators of `Grade` are 0 to 4, so `int counts[5]{}` indexed with `static_cast<int>(grade)`
counts the letters. For `best`, only replace the current best when the new average is **strictly**
greater.
```

```stdin
ana 95
ben 72
ana 85
ben absent
cy absent
```

```expected
ana: avg=90.0 grade=A absences=0
ben: avg=72.0 grade=C absences=1
cy: no scores absences=1
best: ana
grades: A=1 B=0 C=1 D=0 F=0
```

```stdin
dee 89
dee 90
eve 60
fay 59
fay 60
```

```expected
dee: avg=89.5 grade=B absences=0
eve: avg=60.0 grade=D absences=0
fay: avg=59.5 grade=F absences=0
best: dee
grades: A=0 B=1 C=0 D=1 F=1
```

```stdin
```

```expected hidden
best: none
grades: A=0 B=0 C=0 D=0 F=0
```

```stdin
x 80
y 80
z absent
z absent
```

```expected hidden
x: avg=80.0 grade=B absences=0
y: avg=80.0 grade=B absences=0
z: no scores absences=2
best: x
grades: A=0 B=2 C=0 D=0 F=0
```

```stdin
solo 0
solo 100
solo 0
top 100
top absent
```

```expected hidden
solo: avg=33.3 grade=F absences=0
top: avg=100.0 grade=A absences=1
best: top
grades: A=1 B=0 C=0 D=0 F=1
```

```checks
must enum\s+class\s+Grade :: Model the letter grades with enum class Grade.
must std::optional\s*<\s*double\s*> :: Return the average as std::optional<double>.
must struct\s+Student :: Model a student with a struct.
```
:::

:::exercise Vending machine {hard}
Program the controller of a vending machine as a **state machine**: the machine is always in one of
three states, and every command does something different depending on the state.

```cpp
enum class State { Idle, Collecting, OutOfService };
```

It sells three products: `A` for 100 cents, `B` for 150 and `C` for 65. The first input line holds the
initial stock of `A`, `B` and `C`. The machine starts `OutOfService` if all three are 0, otherwise `Idle`.
Then commands follow until the input ends:

- `coin N`: valid coins are 5, 10, 25 and 100. An invalid coin, or any coin while `OutOfService`,
  prints `rejected N`. Otherwise the coin is added to the balance and the machine is `Collecting`.
- `select X`: while `OutOfService` print `out of service`; while `Idle` print `insert coins first`.
  While `Collecting`: an unknown product prints `unknown product`; a product with stock 0 prints
  `sold out`; if the balance is too small print `need M more`. Otherwise print `dispense X, change C`,
  take one from the stock, reset the balance to 0 and go to `Idle`, or to `OutOfService` if that
  emptied the whole machine.
- `cancel`: while `Collecting`, print `refund B` (the balance), reset it, and go to `Idle`. Otherwise print
  `nothing to refund`.
- `restock X N`: an unknown product prints `unknown product`. Otherwise add `N` (0 or more) to its stock;
  an `OutOfService` machine that now has stock becomes `Idle`. Prints nothing.
- `status`: print `<State> balance=<B> stock=A:<a> B:<b> C:<c>`.

**Input:** the initial stock, then commands.
**Output:** the lines described above.

```cpp starter
#include <iostream>

int main() {
}
```

```cpp solution
#include <iostream>
#include <string>
#include <string_view>

enum class State { Idle, Collecting, OutOfService };

std::string_view stateName(State s) {
    switch (s) {
        case State::Idle:         return "Idle";
        case State::Collecting:   return "Collecting";
        case State::OutOfService: return "OutOfService";
    }
    return "?";
}

bool allEmpty(const int stock[]) {
    return stock[0] == 0 && stock[1] == 0 && stock[2] == 0;
}

// Returns the index of a product (0, 1, 2), or -1 if the name is unknown.
int productIndex(const std::string& name) {
    if (name == "A") return 0;
    if (name == "B") return 1;
    if (name == "C") return 2;
    return -1;
}

int main() {
    const int prices[3]{100, 150, 65};
    int stock[3]{};
    std::cin >> stock[0] >> stock[1] >> stock[2];

    State state = allEmpty(stock) ? State::OutOfService : State::Idle;
    int balance = 0;

    std::string command;
    while (std::cin >> command) {
        if (command == "coin") {
            int coin;
            std::cin >> coin;
            bool valid = coin == 5 || coin == 10 || coin == 25 || coin == 100;
            if (!valid || state == State::OutOfService) {
                std::cout << "rejected " << coin << '\n';
            } else {
                balance += coin;
                state = State::Collecting;
            }
        } else if (command == "select") {
            std::string name;
            std::cin >> name;
            switch (state) {
                case State::OutOfService:
                    std::cout << "out of service\n";
                    break;
                case State::Idle:
                    std::cout << "insert coins first\n";
                    break;
                case State::Collecting: {
                    int p = productIndex(name);
                    if (p < 0) {
                        std::cout << "unknown product\n";
                    } else if (stock[p] == 0) {
                        std::cout << "sold out\n";
                    } else if (balance < prices[p]) {
                        std::cout << "need " << prices[p] - balance << " more\n";
                    } else {
                        std::cout << "dispense " << name << ", change " << balance - prices[p] << '\n';
                        --stock[p];
                        balance = 0;
                        state = allEmpty(stock) ? State::OutOfService : State::Idle;
                    }
                    break;
                }
            }
        } else if (command == "cancel") {
            if (state == State::Collecting) {
                std::cout << "refund " << balance << '\n';
                balance = 0;
                state = State::Idle;
            } else {
                std::cout << "nothing to refund\n";
            }
        } else if (command == "restock") {
            std::string name;
            int amount;
            std::cin >> name >> amount;
            int p = productIndex(name);
            if (p < 0) {
                std::cout << "unknown product\n";
            } else {
                stock[p] += amount;
                if (state == State::OutOfService && !allEmpty(stock)) {
                    state = State::Idle;
                }
            }
        } else if (command == "status") {
            std::cout << stateName(state) << " balance=" << balance << " stock=A:" << stock[0]
                      << " B:" << stock[1] << " C:" << stock[2] << '\n';
        }
    }
}
```

```hint
Keep the state in one `State` variable and the balance in an `int`. For `select`, a `switch (state)`
with one `case` per state keeps the rules apart. (A `case` that declares variables needs its own
braces.)
```

```hint
The order of the checks inside `Collecting` matters: unknown product, then sold out, then not enough
money. After dispensing, decide between `Idle` and `OutOfService` by looking at all three stocks.
```

```hint
The product prices and stocks fit nicely in two small arrays indexed 0, 1, 2 for `A`, `B`, `C`.
```

```stdin
2 1 0
status
coin 25
coin 100
select A
status
select C
```

```expected
Idle balance=0 stock=A:2 B:1 C:0
dispense A, change 25
Idle balance=0 stock=A:1 B:1 C:0
insert coins first
```

```stdin
0 1 1
coin 3
coin 100
select C
select A
coin 25
select B
cancel
cancel
```

```expected
rejected 3
dispense C, change 35
insert coins first
need 125 more
refund 25
nothing to refund
```

```stdin
0 0 1
coin 100
select C
status
coin 25
select A
cancel
restock A 0
status
restock B 2
status
coin 100
coin 100
select B
select Z
```

```expected hidden
dispense C, change 35
OutOfService balance=0 stock=A:0 B:0 C:0
rejected 25
out of service
nothing to refund
OutOfService balance=0 stock=A:0 B:0 C:0
Idle balance=0 stock=A:0 B:2 C:0
dispense B, change 50
insert coins first
```

```stdin
1 0 0
coin 100
select B
select Q
restock B 1
select B
coin 25
coin 25
select B
status
```

```expected hidden
sold out
unknown product
need 50 more
dispense B, change 0
Idle balance=0 stock=A:1 B:0 C:0
```

```stdin
0 0 0
status
coin 5
select A
cancel
restock D 1
restock C 3
coin 5
coin 10
coin 25
coin 25
select C
status
```

```expected hidden
OutOfService balance=0 stock=A:0 B:0 C:0
rejected 5
out of service
nothing to refund
unknown product
dispense C, change 0
Idle balance=0 stock=A:0 B:0 C:2
```

```checks
must enum\s+class\s+State :: Model the machine's state with enum class State.
must switch\s*\( :: Use a switch over the state.
```
:::

:::exercise Date calculator {hard}
Build a date calculator for the Gregorian calendar. Model dates as `struct Date { int year; int month;
int day; };` and the days of the week as an `enum class Weekday` (Monday first). Commands, until the
input ends:

| Command | Output |
| --- | --- |
| `weekday DATE` | the day of the week, like `Monday` |
| `add DATE N` | the date `N` days later (`N` can be negative), as `YYYY-MM-DD` |
| `diff DATE1 DATE2` | the number of days from `DATE1` to `DATE2` (negative if `DATE2` is earlier) |

Dates are written `YYYY-MM-DD` with exactly 4, 2 and 2 digits, and years go from 0001 to 9999. A leap year
is divisible by 4, except years divisible by 100 that aren't divisible by 400 (2000 was a leap year,
1900 wasn't). If any date in a command is malformed or doesn't exist (like `2023-02-29` or
`2024-04-31`), print `invalid date` for that command. Results of `add` stay within the valid years, and
`N` is at most 10^7 in absolute value. Use the Gregorian rules for all dates; `0001-01-01` was a Monday.

The trick that makes everything easy: convert a date to a **day number** (for example, the number of
days since `0001-01-01`), do the arithmetic on plain integers, and convert back.

**Input:** one command per line.
**Output:** one line per command.

```cpp starter
#include <iostream>

int main() {
}
```

```cpp solution
#include <iostream>
#include <optional>
#include <string>
#include <string_view>

struct Date {
    int year = 1;
    int month = 1;
    int day = 1;
};

enum class Weekday { Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday };

bool isLeap(int year) {
    return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
}

int daysInMonth(int year, int month) {
    constexpr int days[12]{31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    return (month == 2 && isLeap(year)) ? 29 : days[month - 1];
}

// Reads exactly `count` digits starting at text[pos].
std::optional<int> digits(std::string_view text, std::size_t pos, std::size_t count) {
    int value = 0;
    for (std::size_t i = pos; i < pos + count; ++i) {
        if (text[i] < '0' || text[i] > '9') return std::nullopt;
        value = value * 10 + (text[i] - '0');
    }
    return value;
}

std::optional<Date> parseDate(std::string_view text) {
    if (text.size() != 10 || text[4] != '-' || text[7] != '-') return std::nullopt;
    auto y = digits(text, 0, 4);
    auto m = digits(text, 5, 2);
    auto d = digits(text, 8, 2);
    if (!y || !m || !d) return std::nullopt;
    if (*y < 1 || *m < 1 || *m > 12 || *d < 1 || *d > daysInMonth(*y, *m)) return std::nullopt;
    return Date{*y, *m, *d};
}

// Days since 0001-01-01 (which is day 0).
long long toDayNumber(const Date& date) {
    long long y = date.year - 1;
    long long days = y * 365 + y / 4 - y / 100 + y / 400;   // all the days of the earlier years
    for (int m = 1; m < date.month; ++m) {
        days += daysInMonth(date.year, m);
    }
    return days + date.day - 1;
}

Date fromDayNumber(long long n) {
    Date date;
    while (true) {
        int length = isLeap(date.year) ? 366 : 365;
        if (n < length) break;
        n -= length;
        ++date.year;
    }
    while (n >= daysInMonth(date.year, date.month)) {
        n -= daysInMonth(date.year, date.month);
        ++date.month;
    }
    date.day = static_cast<int>(n) + 1;
    return date;
}

// value as text, padded with leading zeros to the given width
std::string padded(int value, std::size_t width) {
    std::string text = std::to_string(value);
    while (text.size() < width) {
        text = "0" + text;
    }
    return text;
}

std::string format(const Date& date) {
    return padded(date.year, 4) + "-" + padded(date.month, 2) + "-" + padded(date.day, 2);
}

std::string_view weekdayName(Weekday w) {
    switch (w) {
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

int main() {
    std::string command, first;
    while (std::cin >> command >> first) {
        std::optional<Date> a = parseDate(first);
        if (command == "weekday") {
            if (!a) {
                std::cout << "invalid date\n";
            } else {
                std::cout << weekdayName(static_cast<Weekday>(toDayNumber(*a) % 7)) << '\n';
            }
        } else if (command == "add") {
            long long n;
            std::cin >> n;
            if (!a) std::cout << "invalid date\n";
            else std::cout << format(fromDayNumber(toDayNumber(*a) + n)) << '\n';
        } else if (command == "diff") {
            std::string second;
            std::cin >> second;
            std::optional<Date> b = parseDate(second);
            if (!a || !b) std::cout << "invalid date\n";
            else std::cout << toDayNumber(*b) - toDayNumber(*a) << '\n';
        }
    }
}
```

```hint
Read each date as a `std::string` word and validate it yourself: length 10, dashes at positions 4 and 7,
digits everywhere else, month 1 to 12, and a day that exists in that month (February depends on the
leap-year rule). `std::optional<Date>` is a natural return type for the parser.
```

```hint
Day number of a date: all the days of the full years before it (`365` per year, plus one for every leap
year: `y / 4 - y / 100 + y / 400` of the `y` earlier years), plus the days of the earlier months of its
year, plus `day - 1`. Then `diff` is a subtraction, and the weekday is the day number `% 7` (day 0 was a
Monday).
```

```hint
To turn a day number back into a date, subtract whole years (365 or 366 days) while you can, then
whole months. For the output, pad the numbers with leading zeros (`7` becomes `07`, and year `83`
becomes `0083`).
```

```stdin
weekday 2024-01-01
weekday 2000-02-29
add 2024-02-28 1
add 2024-02-28 2
diff 2024-01-01 2025-01-01
```

```expected
Monday
Tuesday
2024-02-29
2024-03-01
366
```

```stdin
add 2023-12-31 1
add 2024-03-01 -1
diff 2025-01-01 2024-01-01
weekday 2023-02-29
weekday 1900-02-29
```

```expected
2024-01-01
2024-02-29
-366
invalid date
invalid date
```

```stdin
weekday 0001-01-01
add 0001-01-01 0
diff 0001-01-01 9999-12-31
add 9999-12-30 1
weekday 9999-12-31
```

```expected hidden
Monday
0001-01-01
3652058
9999-12-31
Friday
```

```stdin
weekday 2024-13-01
weekday 2024-00-10
weekday 2024-04-31
add 2024-06-31 5
diff 2024-01-01 2024-1-1
weekday 2024-04-30
```

```expected hidden
invalid date
invalid date
invalid date
invalid date
invalid date
Tuesday
```

```stdin
add 2000-01-01 1000000
add 2000-01-01 -700000
diff 1970-01-01 2038-01-19
weekday 1969-07-20
add 1600-02-28 1
add 1700-02-28 1
```

```expected hidden
4737-11-28
0083-06-19
24855
Sunday
1600-02-29
1700-03-01
```

```checks
must struct\s+Date :: Model dates with struct Date.
must enum\s+class\s+Weekday :: Model the days of the week with enum class Weekday.
```
:::
