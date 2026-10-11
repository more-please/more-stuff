// The WebAssembly module's interface: compiles and links a set of shaders
// with glslang's front end and reports the result as JSON, for glslang.ts.

#include <cstdio>
#include <cstdlib>
#include <memory>
#include <string>
#include <vector>

#include "glslang/MachineIndependent/localintermediate.h"
#include "glslang/Public/ResourceLimits.h"
#include "glslang/Public/ShaderLang.h"

#define EXPORT(name) extern "C" __attribute__((export_name(name)))

namespace {

std::string result;

void quote(std::string& out, const char* s) {
  out += '"';
  for (; *s; s++) {
    unsigned char c = static_cast<unsigned char>(*s);
    if (c == '"' || c == '\\') {
      out += '\\';
      out += static_cast<char>(c);
    } else if (c == '\n') {
      out += "\\n";
    } else if (c < 0x20) {
      char escape[8];
      std::snprintf(escape, sizeof escape, "\\u%04x", c);
      out += escape;
    } else {
      out += static_cast<char>(c);
    }
  }
  out += '"';
}

void field(std::string& out, const char* name, int value) {
  out += '"';
  out += name;
  out += "\":";
  out += std::to_string(value);
}

// The limits glslang.ts passes, in this order: the built-in constants and
// the texel offsets. GLSL ES 1.00's Appendix A restrictions on loops and
// indexing are applied to the shaders marked `restricted`: glslang would
// otherwise apply them to GLSL ES 3.00 too.
void applyLimits(TBuiltInResource& r, const int* l, bool restricted) {
  r.maxVertexAttribs = l[0];
  r.maxVertexUniformVectors = l[1];
  r.maxVaryingVectors = l[2];
  r.maxVertexTextureImageUnits = l[3];
  r.maxCombinedTextureImageUnits = l[4];
  r.maxTextureImageUnits = l[5];
  r.maxFragmentUniformVectors = l[6];
  r.maxDrawBuffers = l[7];
  r.maxVertexOutputVectors = l[8];
  r.maxFragmentInputVectors = l[9];
  r.minProgramTexelOffset = l[10];
  r.maxProgramTexelOffset = l[11];
  r.limits.nonInductiveForLoops = !restricted;
  r.limits.whileLoops = !restricted;
  r.limits.doWhileLoops = !restricted;
  r.limits.generalUniformIndexing = !restricted;
  r.limits.generalAttributeMatrixVectorIndexing = !restricted;
  r.limits.generalVaryingIndexing = !restricted;
  r.limits.generalSamplerIndexing = !restricted;
  r.limits.generalVariableIndexing = !restricted;
  r.limits.generalConstantMatrixVectorIndexing = !restricted;
}

// A reflected variable or block: its name, type, array size, the block it is
// in (for a uniform, -1 if none) and the stages that use it, and for packing,
// the rows and columns one element takes.
void reflected(std::string& out, const glslang::TObjectReflection& object) {
  out += "{\"name\":";
  quote(out, object.name.c_str());
  const glslang::TType* type = object.getType();
  int rows = 1;
  int columns = 4;
  bool sampler = false;
  if (type) {
    sampler = type->getBasicType() == glslang::EbtSampler;
    out += ",\"type\":";
    quote(out, sampler ? type->getSampler().getString().c_str()
                       : type->getCompleteString(true, false, false).c_str());
    if (type->isMatrix()) {
      rows = type->getMatrixCols();
      columns = type->getMatrixRows();
    } else if (!type->isStruct()) {
      columns = type->getVectorSize();
    }
  }
  out += ',';
  field(out, "size", object.size);
  out += ',';
  field(out, "index", object.index);
  out += ',';
  field(out, "stages", object.stages);
  out += ',';
  field(out, "rows", rows);
  out += ',';
  field(out, "columns", columns);
  out += sampler ? ",\"sampler\":true}" : ",\"sampler\":false}";
}

}  // namespace

EXPORT("alloc") void* alloc(size_t size) { return std::malloc(size); }

EXPORT("release") void release(void* p) { std::free(p); }

EXPORT("check")
const char* check(int count, const int* stages, const char* const* names,
                  const char* const* sources, const int* restricted,
                  const int* limits) {
  static bool initialized = glslang::InitializeProcess();
  (void)initialized;

  result = "{\"shaders\":[";
  bool ok = true;
  std::vector<std::unique_ptr<glslang::TShader>> shaders;
  glslang::TProgram program;
  for (int i = 0; i < count; i++) {
    auto stage = static_cast<EShLanguage>(stages[i]);
    TBuiltInResource resources = *GetDefaultResources();
    applyLimits(resources, limits, restricted[i]);
    auto shader = std::make_unique<glslang::TShader>(stage);
    shader->setStringsWithLengthsAndNames(&sources[i], nullptr, &names[i], 1);
    bool parsed = shader->parse(&resources, 100, false, EShMsgDefault);
    ok = ok && parsed;
    if (i > 0) {
      result += ',';
    }
    result += "{\"ok\":";
    result += parsed ? "true" : "false";
    result += ",\"log\":";
    quote(result, shader->getInfoLog());
    if (glslang::TIntermediate* intermediate = shader->getIntermediate()) {
      result += ',';
      field(result, "version", intermediate->getVersion());
      result += ",\"es\":";
      result += intermediate->getProfile() == EEsProfile ? "true" : "false";
    }
    result += '}';
    program.addShader(shader.get());
    shaders.push_back(std::move(shader));
  }
  result += ']';

  if (ok) {
    bool linked = program.link(EShMsgDefault);
    result += ",\"linked\":";
    result += linked ? "true" : "false";
    result += ",\"linkLog\":";
    quote(result, program.getInfoLog());
    // Without EShReflectionAllBlockVariables, glslang marks every uniform
    // with every stage after the one it is found in; with it, each uniform
    // has only the stages that use it, at the cost of listing the inactive
    // members of uniform blocks too.
    if (linked && program.buildReflection(EShReflectionAllBlockVariables)) {
      result += ",\"uniforms\":[";
      for (int i = 0; i < program.getNumUniformVariables(); i++) {
        if (i > 0) {
          result += ',';
        }
        reflected(result, program.getUniform(i));
      }
      result += "],\"uniformBlocks\":[";
      for (int i = 0; i < program.getNumUniformBlocks(); i++) {
        if (i > 0) {
          result += ',';
        }
        reflected(result, program.getUniformBlock(i));
      }
      result += "],\"attributes\":[";
      for (int i = 0; i < program.getNumPipeInputs(); i++) {
        if (i > 0) {
          result += ',';
        }
        reflected(result, program.getPipeInput(i));
      }
      result += ']';
    }
  }
  result += '}';
  return result.c_str();
}
