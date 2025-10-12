#include "audio_params.h"
#include <cstring>

PROPVARIANT AudioActivationParams::ToPropVariant() const {
    PROPVARIANT var;
    PropVariantInit(&var);
    // 打包结构体为 BLOB
    struct {
        DWORD pid;
        int loopback;
    } packed;
    packed.pid = targetProcessId;
    packed.loopback = (loopbackMode == ProcessLoopbackMode::INCLUDE) ? 1 : 0;
    var.vt = VT_BLOB;
    var.blob.cbSize = sizeof(packed);
    var.blob.pBlobData = (BYTE*)CoTaskMemAlloc(sizeof(packed));
    if (var.blob.pBlobData) {
        memcpy(var.blob.pBlobData, &packed, sizeof(packed));
    }
    return var;
}
