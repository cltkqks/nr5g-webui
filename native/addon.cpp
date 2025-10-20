#include <napi.h>
#include "spectrum.h"

using namespace nr5g;

// Helper: Convert JS array of {frequency, amplitude} to C++ vector
std::vector<SpectrumPoint> jsArrayToSpectrumPoints(const Napi::Array &arr)
{
    std::vector<SpectrumPoint> points;
    points.reserve(arr.Length());

    for (uint32_t i = 0; i < arr.Length(); i++)
    {
        Napi::Value val = arr[i];
        if (val.IsObject())
        {
            Napi::Object obj = val.As<Napi::Object>();
            double freq = obj.Get("frequency").ToNumber().DoubleValue();
            double amp = obj.Get("amplitude").ToNumber().DoubleValue();
            points.push_back({freq, amp});
        }
    }

    return points;
}

// Helper: Convert C++ Bounds to JS object
Napi::Object boundsToJsObject(Napi::Env env, const Bounds &bounds)
{
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("freqMin", bounds.freqMin);
    obj.Set("freqMax", bounds.freqMax);
    obj.Set("ampMin", bounds.ampMin);
    obj.Set("ampMax", bounds.ampMax);
    return obj;
}

// Helper: Convert C++ spectrum points to JS array
Napi::Array spectrumPointsToJsArray(Napi::Env env, const std::vector<SpectrumPoint> &points)
{
    Napi::Array arr = Napi::Array::New(env, points.size());

    for (size_t i = 0; i < points.size(); i++)
    {
        Napi::Object obj = Napi::Object::New(env);
        obj.Set("frequency", points[i].frequency);
        obj.Set("amplitude", points[i].amplitude);
        arr[i] = obj;
    }

    return arr;
}

// Wrapped function: computeBounds
Napi::Value ComputeBounds(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsArray())
    {
        Napi::TypeError::New(env, "Expected array of spectrum points").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Array arr = info[0].As<Napi::Array>();
    std::vector<SpectrumPoint> points = jsArrayToSpectrumPoints(arr);

    Bounds bounds = computeBounds(points);
    return boundsToJsObject(env, bounds);
}

// Wrapped function: computeNoiseFloor
Napi::Value ComputeNoiseFloor(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsArray())
    {
        Napi::TypeError::New(env, "Expected array of spectrum points").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Array arr = info[0].As<Napi::Array>();
    std::vector<SpectrumPoint> points = jsArrayToSpectrumPoints(arr);

    double noiseFloor = computeNoiseFloor(points);
    return Napi::Number::New(env, noiseFloor);
}

// Wrapped function: buildCoords
Napi::Value BuildCoords(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (info.Length() < 4)
    {
        Napi::TypeError::New(env, "Expected (points, width, height, bounds)").ThrowAsJavaScriptException();
        return env.Null();
    }

    if (!info[0].IsArray() || !info[1].IsNumber() || !info[2].IsNumber() || !info[3].IsObject())
    {
        Napi::TypeError::New(env, "Invalid argument types").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Array arr = info[0].As<Napi::Array>();
    int width = info[1].As<Napi::Number>().Int32Value();
    int height = info[2].As<Napi::Number>().Int32Value();
    Napi::Object boundsObj = info[3].As<Napi::Object>();

    std::vector<SpectrumPoint> points = jsArrayToSpectrumPoints(arr);

    Bounds bounds{
        boundsObj.Get("freqMin").ToNumber().DoubleValue(),
        boundsObj.Get("freqMax").ToNumber().DoubleValue(),
        boundsObj.Get("ampMin").ToNumber().DoubleValue(),
        boundsObj.Get("ampMax").ToNumber().DoubleValue()};

    std::vector<float> coords = buildCoords(points, width, height, bounds);

    // Return as Float32Array
    Napi::ArrayBuffer arrayBuffer = Napi::ArrayBuffer::New(
        env,
        coords.data(),
        coords.size() * sizeof(float));

    return Napi::Float32Array::New(env, coords.size(), arrayBuffer, 0);
}

// Wrapped function: generateSpectrumTrace
Napi::Value GenerateSpectrumTrace(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (info.Length() < 4)
    {
        Napi::TypeError::New(env, "Expected (centerFreqGHz, spanGHz, numPoints, seed)").ThrowAsJavaScriptException();
        return env.Null();
    }

    double centerFreqGHz = info[0].ToNumber().DoubleValue();
    double spanGHz = info[1].ToNumber().DoubleValue();
    int numPoints = info[2].ToNumber().Int32Value();
    uint32_t seed = info[3].ToNumber().Uint32Value();

    std::vector<SpectrumPoint> trace = generateSpectrumTrace(centerFreqGHz, spanGHz, numPoints, seed);

    return spectrumPointsToJsArray(env, trace);
}

// Wrapped function: findPeaks
Napi::Value FindPeaks(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (info.Length() < 2 || !info[0].IsArray() || !info[1].IsNumber())
    {
        Napi::TypeError::New(env, "Expected (points, maxPeaks)").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Array arr = info[0].As<Napi::Array>();
    int maxPeaks = info[1].As<Napi::Number>().Int32Value();

    std::vector<SpectrumPoint> points = jsArrayToSpectrumPoints(arr);
    std::vector<SpectrumPoint> peaks = findPeaks(points, maxPeaks);

    return spectrumPointsToJsArray(env, peaks);
}

// Wrapped function: nearestPoint
Napi::Value NearestPoint(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (info.Length() < 2 || !info[0].IsArray() || !info[1].IsNumber())
    {
        Napi::TypeError::New(env, "Expected (points, frequencyHz)").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Array arr = info[0].As<Napi::Array>();
    double frequencyHz = info[1].As<Napi::Number>().DoubleValue();

    std::vector<SpectrumPoint> points = jsArrayToSpectrumPoints(arr);
    SpectrumPoint nearest = nearestPoint(points, frequencyHz);

    Napi::Object result = Napi::Object::New(env);
    result.Set("frequency", nearest.frequency);
    result.Set("amplitude", nearest.amplitude);

    return result;
}

// Wrapped function: processSpectrum (combined operation)
Napi::Value ProcessSpectrum(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsObject())
    {
        Napi::TypeError::New(env, "Expected options object").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Object opts = info[0].As<Napi::Object>();
    Napi::Array pointsArr = opts.Get("points").As<Napi::Array>();

    std::vector<SpectrumPoint> points = jsArrayToSpectrumPoints(pointsArr);

    // Compute all metrics
    Bounds bounds = computeBounds(points);
    double noiseFloor = computeNoiseFloor(points);

    Napi::Object result = Napi::Object::New(env);
    result.Set("bounds", boundsToJsObject(env, bounds));
    result.Set("noiseFloor", noiseFloor);

    // Optionally compute coordinates
    if (opts.Has("width") && opts.Has("height") && opts.Get("computeCoords").ToBoolean())
    {
        int width = opts.Get("width").ToNumber().Int32Value();
        int height = opts.Get("height").ToNumber().Int32Value();

        std::vector<float> coords = buildCoords(points, width, height, bounds);

        Napi::ArrayBuffer arrayBuffer = Napi::ArrayBuffer::New(
            env,
            coords.data(),
            coords.size() * sizeof(float));

        result.Set("coords", Napi::Float32Array::New(env, coords.size(), arrayBuffer, 0));
        result.Set("width", width);
        result.Set("height", height);
    }

    return result;
}

// Initialize module
Napi::Object Init(Napi::Env env, Napi::Object exports)
{
    // Spectrum processing functions
    exports.Set("computeBounds", Napi::Function::New(env, ComputeBounds));
    exports.Set("computeNoiseFloor", Napi::Function::New(env, ComputeNoiseFloor));
    exports.Set("buildCoords", Napi::Function::New(env, BuildCoords));
    exports.Set("generateSpectrumTrace", Napi::Function::New(env, GenerateSpectrumTrace));
    exports.Set("findPeaks", Napi::Function::New(env, FindPeaks));
    exports.Set("nearestPoint", Napi::Function::New(env, NearestPoint));
    exports.Set("processSpectrum", Napi::Function::New(env, ProcessSpectrum));

    return exports;
}

NODE_API_MODULE(nr5g_native, Init)
