---
title: "Organizing Programs: Challenges"
summary: Five hard problems about how programs are put together. A unit converter organized in namespaces, a configuration parsed and validated entirely at compile time, a program full of undefined behavior to make safe, a miniature linker, and a simulator for C++ name lookup.
---

These problems are meant to be **hard**. Some are ordinary programs that must be *organized* well
(namespaces, compile-time code, no macros); others make you implement the rules of this module
yourself (the linker's One Definition Rule, the compiler's name lookup), which is the best way to really
understand them.

Give each problem a real attempt before you open a hint, and read the solution only after your own
version passes. As always, output must match exactly (trailing spaces are ignored), and the hidden tests
go after the corner cases mentioned in the text.

:::quiz
What does this print?

```cpp
#define MIN(a, b) ((a) < (b) ? (a) : (b))

int i = 1;
int j = 2;
int m = MIN(i++, j++);
std::cout << m << ' ' << i << ' ' << j;
```

- [ ] `1 2 3`
- [x] `2 3 3`
- [ ] `1 2 2`
- [ ] It's undefined behavior

The expansion is `((i++) < (j++) ? (i++) : (j++))`. The condition compares `1 < 2` and increments both
(`i = 2`, `j = 3`); it's true, so `(i++)` runs **again**: `m` gets `2` and `i` becomes `3`. The `?:`
operator sequences the condition before the chosen branch, so this is well-defined, just surprising.
A function (or `std::min`) evaluates each argument exactly once.
:::

:::quiz
What happens with this program?

```cpp
#include <iostream>

namespace lib {
    struct Widget {};
    void print(Widget) { std::cout << "lib"; }
}

void print(lib::Widget) { std::cout << "global"; }

int main() {
    print(lib::Widget{});
}
```

- [ ] It prints `lib`
- [ ] It prints `global`
- [x] It doesn't compile: the call is ambiguous
- [ ] It prints `libglobal`

Ordinary lookup finds the global `print`, and argument-dependent lookup adds `lib::print` because the
argument's type lives in `lib`. Both are equally good matches, so the call is ambiguous. ADL doesn't
"prefer" the type's namespace; it only adds candidates.
:::

:::exercise Namespaced unit converter {hard}
Write a unit converter whose code is organized by **namespaces**: everything lives in namespace
`units`, with one nested namespace per dimension: `units::length`, `units::mass`, `units::time` and
`units::temperature`. Give every dimension namespace the **same** small interface (for example
`bool known(std::string_view unit)`, `double toBase(double value, std::string_view unit)` and
`double fromBase(double value, std::string_view unit)`), so the namespaces, not name prefixes, keep the
functions apart. Shared helpers go in `units::detail`.

| Dimension | Units (base unit first) |
| --- | --- |
| length | `m`; `km` = 1000 m, `cm` = 0.01 m, `mm` = 0.001 m, `mi` = 1609.344 m, `yd` = 0.9144 m, `ft` = 0.3048 m, `in` = 0.0254 m |
| mass | `kg`; `g` = 0.001 kg, `t` = 1000 kg, `lb` = 0.45359237 kg, `oz` = 0.028349523125 kg |
| time | `s`; `ms` = 0.001 s, `min` = 60 s, `h` = 3600 s, `day` = 86400 s |
| temperature | `K`; `C` (K = C + 273.15) and `F` (K = (F − 32) × 5 / 9 + 273.15) |

Temperatures can't use a single factor (the scales have different zero points), which is exactly why
each dimension owns its conversion functions.

**Input:** one request per line, `VALUE FROM to TO` (blank lines ignored). `VALUE` is any number a
`double` can be read from (`5`, `-2.5`, `1e3`), with nothing else attached.

**Output**, checked in this order:

1. not exactly 4 words, the third word isn't `to`, or `VALUE` isn't a number:
   `error: expected 'VALUE UNIT to UNIT'`
2. a unit that doesn't exist (check `FROM` first): `error: unknown unit 'UNIT'`
3. units of different dimensions: `error: cannot convert FROM (DIM) to TO (DIM)`, for example
   `error: cannot convert km (length) to kg (mass)`
4. a temperature below 0 K: `error: below absolute zero`
5. otherwise: `VALUE FROM = RESULT TO`, where `VALUE` is echoed exactly as typed, and `RESULT` is
   rounded to 4 decimals with trailing zeros (and a trailing `.`) removed: `3.1069`, `212`, `30.48`.
   A result that rounds to zero prints `0`, never `-0`.

```
5 km to mi       ->  5 km = 3.1069 mi
100 C to F       ->  100 C = 212 F
1 km to kg       ->  error: cannot convert km (length) to kg (mass)
-300 C to K      ->  error: below absolute zero
```

```cpp starter
#include <iostream>
#include <sstream>
#include <string>
#include <string_view>

namespace units {
    // namespace detail, length, mass, time, temperature
}

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        // parse and convert
    }
}
```

```cpp solution
#include <array>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <optional>
#include <sstream>
#include <string>
#include <string_view>

namespace units {

namespace detail {
    struct Factor {
        std::string_view name;
        double toBase;   // how many base units one of these is
    };

    template <std::size_t N>
    std::optional<double> lookup(const std::array<Factor, N>& table, std::string_view unit) {
        for (const Factor& f : table)
            if (f.name == unit) return f.toBase;
        return std::nullopt;
    }
}

// Each dimension offers the same interface: known(), toBase(), fromBase().
namespace length {
    inline constexpr std::string_view name = "length";
    inline constexpr std::array<detail::Factor, 8> table{{
        {"m", 1}, {"km", 1000}, {"cm", 0.01}, {"mm", 0.001},
        {"mi", 1609.344}, {"yd", 0.9144}, {"ft", 0.3048}, {"in", 0.0254}}};
    bool known(std::string_view u) { return detail::lookup(table, u).has_value(); }
    double toBase(double v, std::string_view u) { return v * *detail::lookup(table, u); }
    double fromBase(double v, std::string_view u) { return v / *detail::lookup(table, u); }
}

namespace mass {
    inline constexpr std::string_view name = "mass";
    inline constexpr std::array<detail::Factor, 5> table{{
        {"kg", 1}, {"g", 0.001}, {"t", 1000}, {"lb", 0.45359237}, {"oz", 0.028349523125}}};
    bool known(std::string_view u) { return detail::lookup(table, u).has_value(); }
    double toBase(double v, std::string_view u) { return v * *detail::lookup(table, u); }
    double fromBase(double v, std::string_view u) { return v / *detail::lookup(table, u); }
}

namespace time {
    inline constexpr std::string_view name = "time";
    inline constexpr std::array<detail::Factor, 5> table{{
        {"s", 1}, {"ms", 0.001}, {"min", 60}, {"h", 3600}, {"day", 86400}}};
    bool known(std::string_view u) { return detail::lookup(table, u).has_value(); }
    double toBase(double v, std::string_view u) { return v * *detail::lookup(table, u); }
    double fromBase(double v, std::string_view u) { return v / *detail::lookup(table, u); }
}

namespace temperature {   // not a simple factor: the scales have different zero points
    inline constexpr std::string_view name = "temperature";
    bool known(std::string_view u) { return u == "C" || u == "F" || u == "K"; }
    double toBase(double v, std::string_view u) {   // base: kelvin
        if (u == "C") return v + 273.15;
        if (u == "F") return (v - 32) * 5 / 9 + 273.15;
        return v;
    }
    double fromBase(double k, std::string_view u) {
        if (u == "C") return k - 273.15;
        if (u == "F") return (k - 273.15) * 9 / 5 + 32;
        return k;
    }
}

}   // namespace units

// Fixed 4 decimals, then drop trailing zeros (and a trailing dot); never "-0".
std::string format(double v) {
    std::ostringstream out;
    out << std::fixed << std::setprecision(4) << v;
    std::string s = out.str();
    s.erase(s.find_last_not_of('0') + 1);
    if (s.back() == '.') s.pop_back();
    if (s == "-0") s = "0";
    return s;
}

std::string_view dimensionOf(std::string_view unit) {
    if (units::length::known(unit)) return units::length::name;
    if (units::mass::known(unit)) return units::mass::name;
    if (units::time::known(unit)) return units::time::name;
    if (units::temperature::known(unit)) return units::temperature::name;
    return "";
}

double convert(double v, std::string_view from, std::string_view to, std::string_view dim) {
    if (dim == units::length::name) return units::length::fromBase(units::length::toBase(v, from), to);
    if (dim == units::mass::name) return units::mass::fromBase(units::mass::toBase(v, from), to);
    if (dim == units::time::name) return units::time::fromBase(units::time::toBase(v, from), to);
    return units::temperature::fromBase(units::temperature::toBase(v, from), to);
}

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::istringstream in(line);
        std::string valueText, from, word, to, extra;
        if (!(in >> valueText)) continue;
        double value = 0;
        std::istringstream num(valueText);
        char junk;
        if (!(in >> from >> word >> to) || word != "to" || (in >> extra) || !(num >> value) || (num >> junk)) {
            std::cout << "error: expected 'VALUE UNIT to UNIT'\n";
            continue;
        }
        const std::string_view fromDim = dimensionOf(from);
        const std::string_view toDim = dimensionOf(to);
        if (fromDim.empty() || toDim.empty()) {
            std::cout << "error: unknown unit '" << (fromDim.empty() ? from : to) << "'\n";
        } else if (fromDim != toDim) {
            std::cout << "error: cannot convert " << from << " (" << fromDim << ") to " << to << " (" << toDim
                      << ")\n";
        } else if (fromDim == units::temperature::name && units::temperature::toBase(value, from) < 0) {
            std::cout << "error: below absolute zero\n";
        } else {
            std::cout << valueText << ' ' << from << " = " << format(convert(value, from, to, fromDim)) << ' ' << to
                      << '\n';
        }
    }
}
```

```hint
Convert through the base unit: `fromBase(toBase(value, from), to)`. For the factor-based dimensions,
`toBase` multiplies by the factor and `fromBase` divides by it. A `std::array` of `{name, factor}` pairs
per namespace, plus one lookup helper in `units::detail`, avoids writing the same code four times.
```

```hint
Formatting: print into a `std::ostringstream` with `std::fixed << std::setprecision(4)`, then erase
trailing `0`s and a trailing `.`. A tiny negative value like `-0.00001` becomes `-0.0000`, which strips
to `-0`: special-case it.
```

```hint
Parse `VALUE` as text first (so you can echo it exactly), then convert it with its own
`std::istringstream`, checking that nothing is left over: `1x` isn't a number.
```

```stdin
5 km to mi
100 C to F
-40 F to C
0 K to C
-300 C to K
3 kg to lb
1 day to min
2.5 h to s
12 in to cm
1 km to kg
7 parsec to m
```

```expected
5 km = 3.1069 mi
100 C = 212 F
-40 F = -40 C
0 K = -273.15 C
error: below absolute zero
3 kg = 6.6139 lb
1 day = 1440 min
2.5 h = 9000 s
12 in = 30.48 cm
error: cannot convert km (length) to kg (mass)
error: unknown unit 'parsec'
```

```stdin
5 km mi
abc m to km
1 m to m extra
1x m to cm
1 m into cm

0.00001 mm to km
-0.00001 m to km
1e3 g to kg
1 oz to g
32 F to K
-459.68 F to C
1 ms to day
1 t to oz
3 m to ft
1 h to C
1 kelvin to C
1 C to kelvin
```

```expected hidden
error: expected 'VALUE UNIT to UNIT'
error: expected 'VALUE UNIT to UNIT'
error: expected 'VALUE UNIT to UNIT'
error: expected 'VALUE UNIT to UNIT'
error: expected 'VALUE UNIT to UNIT'
0.00001 mm = 0 km
-0.00001 m = 0 km
1e3 g = 1 kg
1 oz = 28.3495 g
32 F = 273.15 K
error: below absolute zero
1 ms = 0 day
1 t = 35273.9619 oz
3 m = 9.8425 ft
error: cannot convert h (time) to C (temperature)
error: unknown unit 'kelvin'
error: unknown unit 'kelvin'
```

```stdin
1 mi to km
0 C to F
98.6 F to C
1000000 mm to mi
-1 yd to in
```

```expected hidden
1 mi = 1.6093 km
0 C = 32 F
98.6 F = 37 C
1000000 mm = 0.6214 mi
-1 yd = -36 in
```

```checks
must namespace\s+units\b :: Put the converter in namespace units.
must namespace\s+(units::)?length\b :: Give length its own namespace.
must namespace\s+(units::)?mass\b :: Give mass its own namespace.
must namespace\s+(units::)?time\b :: Give time its own namespace.
must namespace\s+(units::)?temperature\b :: Give temperature its own namespace.
mustnot using\s+namespace\s+units :: Call the functions with qualified names instead of a using-directive.
```
:::

:::exercise Compile-time configuration {hard}
The program below has its configuration built in, as one string literal of `key=value;` entries.
Instead of parsing it every time the program starts (or using a pile of `#define`s), parse and
**validate it at compile time**, so a typo in the configuration is a **compile error**, and the running
program only does lookups in a ready-made table.

Requirements:

- A `constexpr` (or `consteval`) function parses `kConfig` into a `std::array` of `{key, value}` pairs
  (two `std::string_view`s pointing into the literal), **sorted by key**, stored in a `constexpr`
  variable. The array's size is computed at compile time from the literal (count the `;`s).
- `static_assert`s check that there are exactly 7 settings, that every key is non-empty and uses only
  `a`-`z`, `0`-`9` and `_`, that no key appears twice, and that `max_users` is an integer from 1 to 10000.
- No macros (`#define`) at all.

Then answer queries, one per line (blank lines ignored):

| Query | Output |
| --- | --- |
| `count` | `7 settings` |
| `keys` | all keys, sorted, separated by single spaces |
| `get KEY` | `KEY = VALUE`, or `error: no setting KEY` |
| `int KEY` | `KEY = N` if the value is an optional `-` followed by 1 to 18 digits; `error: KEY is not an int` if not; `error: no setting KEY` if there's no such key |
| anything else (also extra words) | `error: bad query` |

Try breaking `kConfig` on purpose (duplicate a key, set `max_users=0`, drop an `=`) and check that it
no longer compiles.

```cpp starter
#include <algorithm>
#include <array>
#include <cstddef>
#include <iostream>
#include <optional>
#include <sstream>
#include <string>
#include <string_view>

// The program's built-in configuration. Each entry is "key=value;".
constexpr std::string_view kConfig =
    "name=skill-issue;"
    "version=3;"
    "max_users=250;"
    "timeout_ms=1500;"
    "greeting=Hello, world;"
    "motd=;"
    "ratio=-12;";

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        // answer the query
    }
}
```

```cpp solution
#include <algorithm>
#include <array>
#include <cstddef>
#include <iostream>
#include <optional>
#include <sstream>
#include <string>
#include <string_view>

// The program's built-in configuration. Each entry is "key=value;".
constexpr std::string_view kConfig =
    "name=skill-issue;"
    "version=3;"
    "max_users=250;"
    "timeout_ms=1500;"
    "greeting=Hello, world;"
    "motd=;"
    "ratio=-12;";

struct Setting {
    std::string_view key;
    std::string_view value;
};

constexpr std::size_t countEntries(std::string_view text) {
    return static_cast<std::size_t>(std::count(text.begin(), text.end(), ';'));
}

constexpr std::size_t kCount = countEntries(kConfig);

constexpr bool isKey(std::string_view s) {
    if (s.empty()) return false;
    for (char c : s)
        if (!((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_')) return false;
    return true;
}

// Parses kConfig into a table sorted by key. Any malformed entry makes the
// evaluation non-constant (a throw), which is a compile error.
consteval std::array<Setting, kCount> parseConfig() {
    std::array<Setting, kCount> table{};
    std::string_view rest = kConfig;
    for (std::size_t i = 0; i < kCount; ++i) {
        const std::size_t semi = rest.find(';');
        const std::string_view entry = rest.substr(0, semi);
        const std::size_t eq = entry.find('=');
        if (eq == std::string_view::npos) throw "config entry without '='";
        table[i] = {entry.substr(0, eq), entry.substr(eq + 1)};
        rest.remove_prefix(semi + 1);
    }
    std::sort(table.begin(), table.end(), [](const Setting& a, const Setting& b) { return a.key < b.key; });
    return table;
}

constexpr auto kSettings = parseConfig();

constexpr std::optional<std::string_view> find(std::string_view key) {
    auto it = std::lower_bound(kSettings.begin(), kSettings.end(), key,
                               [](const Setting& s, std::string_view k) { return s.key < k; });
    if (it == kSettings.end() || it->key != key) return std::nullopt;
    return it->value;
}

constexpr std::optional<long long> toInt(std::string_view s) {
    bool negative = !s.empty() && s[0] == '-';
    if (negative) s.remove_prefix(1);
    if (s.empty() || s.size() > 18) return std::nullopt;
    long long value = 0;
    for (char c : s) {
        if (c < '0' || c > '9') return std::nullopt;
        value = value * 10 + (c - '0');
    }
    return negative ? -value : value;
}

constexpr bool allKeysValid() {
    return std::all_of(kSettings.begin(), kSettings.end(), [](const Setting& s) { return isKey(s.key); });
}

constexpr bool noDuplicates() {
    for (std::size_t i = 1; i < kSettings.size(); ++i)
        if (kSettings[i - 1].key == kSettings[i].key) return false;
    return true;
}

static_assert(kCount == 7, "expected 7 settings");
static_assert(allKeysValid(), "keys must be lowercase identifiers");
static_assert(noDuplicates(), "duplicate key in kConfig");
static_assert(find("max_users") && toInt(*find("max_users")) &&
                  *toInt(*find("max_users")) >= 1 && *toInt(*find("max_users")) <= 10000,
              "max_users must be an integer from 1 to 10000");

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::istringstream in(line);
        std::string cmd, key, extra;
        if (!(in >> cmd)) continue;
        if ((cmd == "count" || cmd == "keys") && !(in >> extra)) {
            if (cmd == "count") {
                std::cout << kCount << " settings\n";
            } else {
                for (std::size_t i = 0; i < kSettings.size(); ++i) std::cout << (i ? " " : "") << kSettings[i].key;
                std::cout << '\n';
            }
        } else if ((cmd == "get" || cmd == "int") && (in >> key) && !(in >> extra)) {
            const auto value = find(key);
            if (!value) {
                std::cout << "error: no setting " << key << '\n';
            } else if (cmd == "get") {
                std::cout << key << " = " << *value << '\n';
            } else if (auto n = toInt(*value)) {
                std::cout << key << " = " << *n << '\n';
            } else {
                std::cout << "error: " << key << " is not an int\n";
            }
        } else {
            std::cout << "error: bad query\n";
        }
    }
}
```

```hint
`constexpr std::size_t kCount = std::count(kConfig.begin(), kConfig.end(), ';');` gives the size, and a
`consteval std::array<Setting, kCount> parseConfig()` can loop with `find(';')`, `find('=')` and
`substr` on `std::string_view`, which are all `constexpr`.
```

```hint
`std::sort` and `std::lower_bound` are `constexpr` since C++20, so you can sort the table inside the
parser and binary-search it in a `constexpr` `find(key)` helper that returns
`std::optional<std::string_view>`. The same helper then works in `static_assert` and at run time.
```

```hint
Inside a `consteval` function, `throw` makes the evaluation fail, so `if (eq == npos) throw "missing '='";`
turns a malformed entry into a compile error with a readable message.
```

```stdin
count
keys
get greeting
get motd
int max_users
int ratio
int name
```

```expected
7 settings
greeting max_users motd name ratio timeout_ms version
greeting = Hello, world
motd =
max_users = 250
ratio = -12
error: name is not an int
```

```stdin
int motd
get nope
int nope
get version
int timeout_ms
frobnicate
get
get a b
count 2

keys please
get Name
```

```expected hidden
error: motd is not an int
error: no setting nope
error: no setting nope
version = 3
timeout_ms = 1500
error: bad query
error: bad query
error: bad query
error: bad query
error: bad query
error: no setting Name
```

```stdin
keys
int version
get name
int greeting
get ratio
count
```

```expected hidden
greeting max_users motd name ratio timeout_ms version
version = 3
name = skill-issue
error: greeting is not an int
ratio = -12
7 settings
```

```checks
must consteval|constexpr\s+std::array :: Parse the configuration at compile time.
must (static_assert[\s\S]*){4} :: Validate the configuration with (at least four) static_asserts.
must constexpr\s+(auto|std::array\s*<[^;]*>)\s+\w+\s*=\s*\w+\s*\( :: Keep the parsed table in a constexpr variable.
mustnot #\s*define :: No macros.
```
:::

:::exercise Spot the UB: score statistics {hard}
The starter is a real program with at least **six bugs**, and most of them are **undefined behavior**: it
may print correct results for a lucky input, garbage for another, or crash. Find them and fix them
(sanitizers and `-Wall` warnings are your friends on your own machine). Keep the program's structure; just
make it correct and safe.

**What the program must do.** Read integer scores until the end of input. A score outside 0 to 100 prints
`ignored: X` and is skipped. Then print:

```
count: <number of valid scores>
first: <the first valid score>
best: <the highest valid score>
average: <the mean, with 2 decimals>
median: <the median, with 1 decimal>
grade: <letter for the median: A >= 90, B >= 80, C >= 70, D >= 60, otherwise F>
histogram:
  <low>-<high>: <count>
checksum: <c>
```

- With no valid scores, print `count: 0` and then `no valid scores`, nothing more.
- The median of an even number of scores is the mean of the two middle ones.
- The histogram has buckets `0-9`, `10-19`, ..., `80-89` and `90-100` (100 belongs to the last
  bucket). Only non-empty buckets are printed, in order.
- The checksum starts at 0 and, for each valid score `s` in input order, becomes `c * 31 + s`, computed
  **modulo 2^32** (as a 32-bit unsigned number).

```cpp starter
#include <algorithm>
#include <iomanip>
#include <iostream>
#include <string>
#include <string_view>
#include <vector>

std::string_view grade(double score) {
    std::string letter = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
    return letter;
}

int main() {
    std::vector<int> valid;
    const int* first = nullptr;
    int best;
    int sum = 0;
    int checksum = 0;
    int buckets[10] = {};

    int score;
    while (std::cin >> score) {
        if (score < 0 || score > 100) {
            std::cout << "ignored: " << score << '\n';
            continue;
        }
        valid.push_back(score);
        if (valid.size() == 1) first = &valid.front();
        if (score > best) best = score;
        sum += score;
        checksum = checksum * 31 + score;
        ++buckets[score / 10];
    }

    const int count = static_cast<int>(valid.size());
    std::cout << "count: " << count << '\n';
    std::cout << "first: " << *first << '\n';
    std::cout << "best: " << best << '\n';
    std::cout << std::fixed << std::setprecision(2) << "average: " << static_cast<double>(sum / count) << '\n';

    std::sort(valid.begin(), valid.end());
    const double median = count % 2 ? valid[count / 2] : (valid[count / 2 - 1] + valid[count / 2]) / 2.0;
    std::cout << std::setprecision(1) << "median: " << median << '\n';
    std::cout << "grade: " << grade(median) << '\n';

    std::cout << "histogram:\n";
    for (int b = 0; b < 10; ++b) {
        if (buckets[b] == 0) continue;
        std::cout << "  " << b * 10 << '-' << (b == 9 ? 100 : b * 10 + 9) << ": " << buckets[b] << '\n';
    }
    std::cout << "checksum: " << checksum << '\n';
}
```

```cpp solution
#include <algorithm>
#include <cstdint>
#include <iomanip>
#include <iostream>
#include <string>
#include <vector>

std::string grade(double score) {   // return by value: a view of a local would dangle
    return score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
}

int main() {
    std::vector<int> valid;
    int first = 0;               // a copy, not a pointer into a vector that may reallocate
    int best = 0;                // initialized; only read when there is at least one score
    long long sum = 0;
    std::uint32_t checksum = 0;  // unsigned arithmetic wraps by definition
    int buckets[10] = {};

    int score;
    while (std::cin >> score) {
        if (score < 0 || score > 100) {
            std::cout << "ignored: " << score << '\n';
            continue;
        }
        valid.push_back(score);
        if (valid.size() == 1 || score > best) best = score;
        if (valid.size() == 1) first = score;
        sum += score;
        checksum = checksum * 31u + static_cast<std::uint32_t>(score);
        ++buckets[std::min(score / 10, 9)];   // 100 belongs to the last bucket, not to buckets[10]
    }

    const int count = static_cast<int>(valid.size());
    std::cout << "count: " << count << '\n';
    if (count == 0) {                         // no division by zero, no valid[-1]
        std::cout << "no valid scores\n";
        return 0;
    }
    std::cout << "first: " << first << '\n';
    std::cout << "best: " << best << '\n';
    std::cout << std::fixed << std::setprecision(2) << "average: " << static_cast<double>(sum) / count << '\n';

    std::sort(valid.begin(), valid.end());
    const double median = count % 2 ? valid[count / 2] : (valid[count / 2 - 1] + valid[count / 2]) / 2.0;
    std::cout << std::setprecision(1) << "median: " << median << '\n';
    std::cout << "grade: " << grade(median) << '\n';

    std::cout << "histogram:\n";
    for (int b = 0; b < 10; ++b) {
        if (buckets[b] == 0) continue;
        std::cout << "  " << b * 10 << '-' << (b == 9 ? 100 : b * 10 + 9) << ": " << buckets[b] << '\n';
    }
    std::cout << "checksum: " << checksum << '\n';
}
```

```hint
Look for these classics: a variable read before it's ever assigned; signed integer overflow; an array
index that can reach the array's size; division by zero; a pointer into a `std::vector` kept across
`push_back`; and a `std::string_view` that outlives the string it views.
```

```hint
Overflow: the checksum grows by a factor of 31 per score, so after 7 scores it no longer fits in an
`int`. Unsigned arithmetic is defined to wrap modulo 2^N, so `std::uint32_t` gives exactly the
required "modulo 2^32" result.
```

```hint
`first` points at `valid.front()`, but the next `push_back` may reallocate the vector and move every
element: store the value instead. And `grade` returns a view of its local `letter`, which is destroyed
when the function returns: return a `std::string` (or a `const char*` to a string literal).
```

```stdin
72 95 88 101 -3 64 72
```

```expected
ignored: 101
ignored: -3
count: 5
first: 72
best: 95
average: 78.20
median: 72.0
grade: C
histogram:
  60-69: 1
  70-79: 2
  80-89: 1
  90-100: 1
checksum: 69410281
```

```stdin
100 100 0 99 89 79 69 59 49 39
```

```expected hidden
count: 10
first: 100
best: 100
average: 68.30
median: 74.0
grade: C
histogram:
  0-9: 1
  30-39: 1
  40-49: 1
  50-59: 1
  60-69: 1
  70-79: 1
  80-89: 1
  90-100: 3
checksum: 1758283749
```

```expected hidden
count: 0
no valid scores
```

```stdin
1000 -1
```

```expected hidden
ignored: 1000
ignored: -1
count: 0
no valid scores
```

```stdin
55
```

```expected hidden
count: 1
first: 55
best: 55
average: 55.00
median: 55.0
grade: F
histogram:
  50-59: 1
checksum: 55
```

```checks
must uint32_t|unsigned :: Compute the checksum with unsigned 32-bit arithmetic.
```
:::

:::exercise Mini linker {hard}
Simulate what a C++ linker does with the symbols of several translation units, including the One
Definition Rule and internal linkage.

**Input:** a description of the `.cpp` files of a program, one directive per line (blank lines ignored):

| Line | Meaning |
| --- | --- |
| `file NAME` | the following lines describe translation unit `NAME` (the input starts with a `file` line) |
| `define SYM` | an ordinary definition with **external** linkage, like `int helper() { ... }` |
| `inline SYM` | an `inline` definition (external linkage; identical copies may appear in many files) |
| `static SYM` | a definition with **internal** linkage (`static` or in an anonymous namespace): visible only inside this file |
| `use SYM` | this file calls or reads `SYM` |

**Diagnostics**, printed in this order:

1. **Compile errors**, in input order: a symbol defined twice in the **same** file (in any combination of
   `define`, `inline`, `static`; that's what a missing include guard causes) prints
   `FILE: error: redefinition of 'SYM'` at the second definition, which is then ignored.
2. **Link errors about definitions**, one per symbol, sorted by symbol name:
   - a symbol with a plain `define` in two or more files:
     `multiple definition of 'SYM' (FILE1, FILE2, ...)` listing those files in input order;
   - otherwise, a symbol with a plain `define` in one file and `inline` in another:
     `ODR violation: 'SYM' is inline in some files but not in others`. (Real linkers usually
     **don't** detect this: the ODR says "no diagnostic required", which is what makes it so dangerous.
     Our linker is stricter.)
   - `static` definitions never conflict with anything in other files.
3. **Undefined references**: for every file, in input order, and every symbol it uses, in first-use order
   (each pair once): if the file has no definition of its own (any kind) and **no** file has an external
   (`define` or `inline`) definition, print `undefined reference to 'SYM' in FILE`. A `static` definition
   in another file doesn't help.

Finally print `link ok: N files` if there were no messages at all, otherwise `errors: N` (the number of
messages printed).

```
file main.cpp                 undefined reference to 'version' in main.cpp
use helper                    undefined reference to 'version' in version.cpp
use log                       errors: 2
use version
use twice
file util.cpp
define helper
static log
inline twice
file log.cpp
define log
inline twice
file version.cpp
use version
```

`log` is fine: `util.cpp`'s `static log` is private to `util.cpp`, so it can't clash with `log.cpp`'s.

```cpp starter
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <vector>

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        // record each file's definitions and uses
    }
    // then report the errors
}
```

```cpp solution
#include <algorithm>
#include <iostream>
#include <map>
#include <set>
#include <sstream>
#include <string>
#include <vector>

struct TranslationUnit {
    std::string name;
    std::map<std::string, std::string> defs;   // symbol -> "define" | "inline" | "static"
    std::vector<std::string> uses;             // in first-use order, no repeats
};

int main() {
    std::vector<TranslationUnit> units;
    int errors = 0;
    std::string line;
    while (std::getline(std::cin, line)) {
        std::istringstream in(line);
        std::string kind, sym;
        if (!(in >> kind >> sym)) continue;
        if (kind == "file") {
            units.push_back({sym, {}, {}});
            continue;
        }
        if (units.empty()) continue;
        TranslationUnit& tu = units.back();
        if (kind == "use") {
            if (std::find(tu.uses.begin(), tu.uses.end(), sym) == tu.uses.end()) tu.uses.push_back(sym);
        } else if (tu.defs.contains(sym)) {   // a second definition in the same file: compile error
            std::cout << tu.name << ": error: redefinition of '" << sym << "'\n";
            ++errors;
        } else {
            tu.defs[sym] = kind;
        }
    }

    // Link step: collect the external (non-static) definitions of every symbol.
    std::map<std::string, std::vector<std::string>> strong;   // symbol -> files with a plain definition
    std::map<std::string, std::vector<std::string>> weak;     // symbol -> files with an inline definition
    for (const auto& tu : units)
        for (const auto& [sym, kind] : tu.defs) {
            if (kind == "define") strong[sym].push_back(tu.name);
            else if (kind == "inline") weak[sym].push_back(tu.name);
        }

    std::set<std::string> symbols;
    for (const auto& [sym, files] : strong) symbols.insert(sym);
    for (const auto& [sym, files] : weak) symbols.insert(sym);
    for (const auto& sym : symbols) {
        const auto& s = strong[sym];
        if (s.size() > 1) {
            std::cout << "multiple definition of '" << sym << "' (";
            for (std::size_t i = 0; i < s.size(); ++i) std::cout << (i ? ", " : "") << s[i];
            std::cout << ")\n";
            ++errors;
        } else if (s.size() == 1 && !weak[sym].empty()) {
            std::cout << "ODR violation: '" << sym << "' is inline in some files but not in others\n";
            ++errors;
        }
    }

    for (const auto& tu : units)
        for (const auto& sym : tu.uses) {
            if (tu.defs.contains(sym)) continue;                       // defined here (static or not)
            if (!strong[sym].empty() || !weak[sym].empty()) continue;  // defined elsewhere, externally visible
            std::cout << "undefined reference to '" << sym << "' in " << tu.name << '\n';
            ++errors;
        }

    if (errors == 0) std::cout << "link ok: " << units.size() << " files\n";
    else std::cout << "errors: " << errors << '\n';
}
```

```hint
Per file, keep a `std::map<std::string, std::string>` from symbol to its kind (that detects
redefinitions immediately) and a vector of used symbols. After reading everything, build, per symbol, the
list of files that define it plainly and the list that define it `inline`.
```

```hint
A use is satisfied by the file's **own** definition of any kind, or by **any** file's external
definition. Only then is it an undefined reference. `static` definitions only count in their own file.
```

```stdin
file main.cpp
use helper
use log
use version
use twice
file util.cpp
define helper
static log
inline twice
file log.cpp
define log
inline twice
file version.cpp
use version
```

```expected
undefined reference to 'version' in main.cpp
undefined reference to 'version' in version.cpp
errors: 2
```

```stdin
file a.cpp
define x
inline y
define z
define z
use q
use q
static s
file b.cpp
define x
define y
use s
static z
file c.cpp
define x
use z
inline w
inline w
```

```expected
a.cpp: error: redefinition of 'z'
c.cpp: error: redefinition of 'w'
multiple definition of 'x' (a.cpp, b.cpp, c.cpp)
ODR violation: 'y' is inline in some files but not in others
undefined reference to 'q' in a.cpp
undefined reference to 's' in b.cpp
errors: 6
```

```stdin
file solo.cpp
use main
define main
```

```expected hidden
link ok: 1 files
```

```stdin
file m.cpp
use beta
use alpha
use gamma
use beta

file p.cpp
static alpha
static gamma
use alpha
file q.cpp
inline gamma
static delta
define epsilon
use delta
file r.cpp
use delta
define epsilon
inline zeta
file s.cpp
define zeta
static zeta
use zeta
```

```expected hidden
s.cpp: error: redefinition of 'zeta'
multiple definition of 'epsilon' (q.cpp, r.cpp)
ODR violation: 'zeta' is inline in some files but not in others
undefined reference to 'beta' in m.cpp
undefined reference to 'alpha' in m.cpp
undefined reference to 'delta' in r.cpp
errors: 6
```

:::

:::exercise Name lookup simulator {hard}
When you write a name in C++, the compiler has to decide **which** declaration you mean. Implement (a
simplified version of) its rules.

**Input:** lines (blank lines ignored):

- `decl NAME` declares a variable. `NAME` is qualified with the namespaces it lives in: `a::b::x` is a
  variable `x` in namespace `a::b`; `x` or `::x` is a global variable. Declaring `a::b::x` also makes
  the namespaces `a` and `a::b` exist.
- `lookup NAME in SCOPE` looks `NAME` up from code inside namespace `SCOPE` (`a::b`, or `::` for the
  global namespace). The scope doesn't have to exist.
- Any other line prints `error: bad line`.

**Rules:**

1. **Unqualified** `x`: look for a variable `x` declared directly in `SCOPE`, then in each enclosing
   namespace, up to the global namespace. The first one found wins.
2. **Qualified** `p::q::x`: first find the **namespace** `p` (only namespaces count here, not
   variables), starting in `SCOPE` and moving outward like rule 1: the innermost scope that contains a
   namespace named `p` wins. Then `q::x` must be found **exactly** inside that `p`, and if it isn't, the
   lookup **fails**: the compiler does not go back and try an outer `p`.
3. **Fully qualified** `::p::x` (or `::x`): exactly that variable, nothing else.

**Output:** `NAME from SCOPE -> RESULT`, where `SCOPE` is written in full with a leading `::` (`::a::b`,
or just `::` for the global namespace) and `RESULT` is the fully qualified name found, like `::a::x`, or
`not found`.

```
decl x                                x from ::a::b::c -> ::a::x
decl a::x                             b::y from ::a::b::c -> ::a::b::y
decl a::b::y                          b::w from ::a -> not found
decl b::y                             ::b::w from ::a -> ::b::w
decl b::w
lookup x in a::b::c
lookup b::y in a::b::c
lookup b::w in a
lookup ::b::w in a
```

In `b::w from ::a`, the namespace `b` is found as `::a::b`, which has no `w`, so the lookup fails even
though `::b::w` exists. That's real C++ behavior, and a classic source of confusing errors.

```cpp starter
#include <iostream>
#include <set>
#include <sstream>
#include <string>
#include <vector>

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        // decl / lookup
    }
}
```

```cpp solution
#include <iostream>
#include <set>
#include <sstream>
#include <string>
#include <vector>

using Path = std::vector<std::string>;   // {"a", "b"} is namespace a::b; {} is the global namespace

Path split(std::string name) {
    if (name.starts_with("::")) name.erase(0, 2);
    Path parts;
    std::size_t start = 0;
    while (!name.empty()) {
        const std::size_t sep = name.find("::", start);
        parts.push_back(name.substr(start, sep - start));
        if (sep == std::string::npos) break;
        start = sep + 2;
    }
    return parts;
}

std::string join(const Path& p) {
    std::string out;
    for (const auto& part : p) out += "::" + part;
    return out.empty() ? "::" : out;
}

Path concat(Path a, const Path& b) {
    a.insert(a.end(), b.begin(), b.end());
    return a;
}

class Program {
public:
    void declare(const std::string& qualified) {
        Path p = split(qualified);
        vars_.insert(p);
        for (std::size_t n = 1; n < p.size(); ++n) namespaces_.insert(Path(p.begin(), p.begin() + n));
    }

    // Returns the full name found, or "" if the lookup fails.
    std::string lookup(const std::string& name, const Path& scope) const {
        Path parts = split(name);
        if (name.starts_with("::")) return vars_.contains(parts) ? join(parts) : "";   // fully qualified

        if (parts.size() == 1) {   // unqualified: search the scope, then each enclosing namespace
            for (Path s = scope;; s.pop_back()) {
                if (vars_.contains(concat(s, parts))) return join(concat(s, parts));
                if (s.empty()) return "";
            }
        }

        // qualified: find the namespace named parts[0] from the innermost scope outward (only
        // namespaces count), then resolve the rest strictly inside it, with no fallback.
        for (Path s = scope;; s.pop_back()) {
            Path ns = concat(s, {parts[0]});
            if (namespaces_.contains(ns)) {
                Path full = concat(ns, Path(parts.begin() + 1, parts.end()));
                return vars_.contains(full) ? join(full) : "";
            }
            if (s.empty()) return "";
        }
    }

private:
    std::set<Path> vars_;
    std::set<Path> namespaces_;
};

int main() {
    Program program;
    std::string line;
    while (std::getline(std::cin, line)) {
        std::istringstream in(line);
        std::string word, name, inWord, scope, extra;
        if (!(in >> word)) continue;
        if (word == "decl" && (in >> name) && !(in >> extra)) {
            program.declare(name);
        } else if (word == "lookup" && (in >> name >> inWord >> scope) && inWord == "in" && !(in >> extra)) {
            const std::string found = program.lookup(name, split(scope));
            std::cout << name << " from " << join(split(scope)) << " -> " << (found.empty() ? "not found" : found)
                      << '\n';
        } else {
            std::cout << "error: bad line\n";
        }
    }
}
```

```hint
Represent names as paths, `std::vector<std::string>`: `a::b::x` is `{"a", "b", "x"}`, the global scope is
`{}`. Keep two `std::set`s of paths: declared variables, and namespaces (every proper prefix of a
declared variable's path).
```

```hint
"Moving outward" is a loop that tries `scope + name`, then drops the last element of `scope` and tries
again, until the scope is empty (the global namespace, which you try too).
```

```stdin
decl x
decl a::x
decl a::b::y
decl b::y
decl b::w
lookup x in a::b::c
lookup b::y in a::b::c
lookup b::w in a
lookup ::b::w in a
```

```expected
x from ::a::b::c -> ::a::x
b::y from ::a::b::c -> ::a::b::y
b::w from ::a -> not found
::b::w from ::a -> ::b::w
```

```stdin
decl x
decl a::x
decl a::b::y
decl a::b::c::z
decl b::y
decl b::w
lookup y in a::b::c
lookup y in ::
lookup y in b
lookup w in a::b
lookup c::z in a
lookup c::z in a::b::c
lookup ::x in a::b
lookup q in a
lookup b::c::z in a
lookup x in ::a
lookup x in zzz::yyy
foo
lookup x a
```

```expected hidden
y from ::a::b::c -> ::a::b::y
y from :: -> not found
y from ::b -> ::b::y
w from ::a::b -> not found
c::z from ::a -> not found
c::z from ::a::b::c -> ::a::b::c::z
::x from ::a::b -> ::x
q from ::a -> not found
b::c::z from ::a -> ::a::b::c::z
x from ::a -> ::a::x
x from ::zzz::yyy -> ::x
error: bad line
error: bad line
```

```stdin
decl outer::inner::v
decl outer::inner
decl inner::v
decl inner::deep::v
lookup inner in outer
lookup inner::v in outer
lookup inner::v in ::
lookup inner::deep::v in outer
lookup inner::deep::v in outer::inner
lookup ::inner in outer
lookup ::outer::inner::v in inner::deep
lookup v in outer::inner::more
```

```expected hidden
inner from ::outer -> ::outer::inner
inner::v from ::outer -> ::outer::inner::v
inner::v from :: -> ::inner::v
inner::deep::v from ::outer -> not found
inner::deep::v from ::outer::inner -> not found
::inner from ::outer -> not found
::outer::inner::v from ::inner::deep -> ::outer::inner::v
v from ::outer::inner::more -> ::outer::inner::v
```

:::
