#include "audio_params.h"
#include <audioclientactivationparams.h>
#include <cstring>

PROPVARIANT AudioActivationParams::ToPropVariant() const {
    PROPVARIANT var;
    PropVariantInit(&var);
    
    // 使用 AUDIOCLIENT_ACTIVATION_PARAMS 结构（Windows 10 WASAPI 进程环回）
    AUDIOCLIENT_ACTIVATION_PARAMS activationParams = {};
    activationParams.ActivationType = AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK;
    
    // 设置进程环回参数
    AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS loopbackParams = {};
    loopbackParams.TargetProcessId = targetProcessId;
    loopbackParams.ProcessLoopbackMode = (loopbackMode == ProcessLoopbackMode::INCLUDE) 
        ? PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE 
        : PROCESS_LOOPBACK_MODE_EXCLUDE_TARGET_PROCESS_TREE;
    
    activationParams.ProcessLoopbackParams = loopbackParams;
    
    // 打包为 PROPVARIANT（VT_BLOB）
    var.vt = VT_BLOB;
    var.blob.cbSize = sizeof(activationParams);
    var.blob.pBlobData = (BYTE*)CoTaskMemAlloc(sizeof(activationParams));
    if (var.blob.pBlobData) {
        memcpy(var.blob.pBlobData, &activationParams, sizeof(activationParams));
    }
    return var;
}
