// Stands in for glslang's OSDependent sources, which need process clocks that
// WASI does not have, for a diagnostic the module never uses.

#include "glslang/OSDependent/osinclude.h"

namespace glslang {
void OS_DumpMemoryCounters() {}
}  // namespace glslang
