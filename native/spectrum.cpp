#include "spectrum.h"
#include <algorithm>
#include <cmath>
#include <limits>
#include <numeric>

namespace nr5g
{

    Bounds computeBounds(const std::vector<SpectrumPoint> &points)
    {
        if (points.empty())
        {
            return {0.0, 1.0, -200.0, 0.0};
        }

        Bounds bounds{
            std::numeric_limits<double>::infinity(),
            -std::numeric_limits<double>::infinity(),
            std::numeric_limits<double>::infinity(),
            -std::numeric_limits<double>::infinity()};

        for (const auto &point : points)
        {
            bounds.freqMin = std::min(bounds.freqMin, point.frequency);
            bounds.freqMax = std::max(bounds.freqMax, point.frequency);
            bounds.ampMin = std::min(bounds.ampMin, point.amplitude);
            bounds.ampMax = std::max(bounds.ampMax, point.amplitude);
        }

        // Handle edge cases
        if (!std::isfinite(bounds.freqMin) || !std::isfinite(bounds.freqMax))
        {
            bounds.freqMin = 0.0;
            bounds.freqMax = 1.0;
        }
        if (!std::isfinite(bounds.ampMin) || !std::isfinite(bounds.ampMax))
        {
            bounds.ampMin = -200.0;
            bounds.ampMax = 0.0;
        }

        return bounds;
    }

    double computeNoiseFloor(const std::vector<SpectrumPoint> &points)
    {
        if (points.empty())
        {
            return -200.0;
        }

        // Create a copy for sorting
        std::vector<double> amplitudes;
        amplitudes.reserve(points.size());
        for (const auto &point : points)
        {
            amplitudes.push_back(point.amplitude);
        }

        // Sort amplitudes in ascending order
        std::sort(amplitudes.begin(), amplitudes.end());

        // Take the lowest 20% (minimum 5 samples)
        size_t sampleSize = std::max(size_t(5), static_cast<size_t>(amplitudes.size() * 0.2));
        sampleSize = std::min(sampleSize, amplitudes.size());

        // Compute average of the lowest samples
        double sum = std::accumulate(amplitudes.begin(), amplitudes.begin() + sampleSize, 0.0);
        double noise = sum / sampleSize;

        // Round to 1 decimal place
        return std::round(noise * 10.0) / 10.0;
    }

    std::vector<float> buildCoords(
        const std::vector<SpectrumPoint> &points,
        int width,
        int height,
        const Bounds &bounds)
    {
        std::vector<float> coords;
        coords.reserve(points.size() * 2);

        double freqSpan = bounds.freqMax - bounds.freqMin;
        double ampSpan = bounds.ampMax - bounds.ampMin;

        // Prevent division by zero
        if (freqSpan <= 0.0)
            freqSpan = 1.0;
        if (ampSpan <= 0.0)
            ampSpan = 1.0;

        for (const auto &point : points)
        {
            // Normalize to [0, 1] then scale to screen dimensions
            float x = static_cast<float>(((point.frequency - bounds.freqMin) / freqSpan) * width);
            float y = static_cast<float>(height - ((point.amplitude - bounds.ampMin) / ampSpan) * height);

            coords.push_back(x);
            coords.push_back(y);
        }

        return coords;
    }

    // Linear Congruential Generator for deterministic random numbers
    class SeededRandom
    {
    public:
        explicit SeededRandom(uint32_t seed) : state_(seed) {}

        double next()
        {
            state_ = (1664525U * state_ + 1013904223U);
            return static_cast<double>(state_) / static_cast<double>(UINT32_MAX);
        }

    private:
        uint32_t state_;
    };

    std::vector<SpectrumPoint> generateSpectrumTrace(
        double centerFreqGHz,
        double spanGHz,
        int numPoints,
        uint32_t seed)
    {
        std::vector<SpectrumPoint> trace;
        trace.reserve(numPoints);

        SeededRandom rng(seed);
        double startFreq = centerFreqGHz - spanGHz / 2.0;
        double step = spanGHz / (numPoints - 1);
        double baseline = -120.0;

        for (int i = 0; i < numPoints; ++i)
        {
            double frequency = (startFreq + step * i) * 1e9; // Convert GHz to Hz

            // Random noise
            double noise = baseline + (rng.next() * 4.0 - 2.0);

            // Main signal peak (Gaussian)
            double idx_normalized = static_cast<double>(i - numPoints / 2) / (numPoints / 10.0);
            double signalPeak = -20.0 * std::exp(-idx_normalized * idx_normalized) + 5.0;

            // Spur 1 (30% position)
            double spur1_idx = static_cast<double>(i - numPoints * 0.3) / (numPoints / 25.0);
            double spur1 = -45.0 * std::exp(-spur1_idx * spur1_idx);

            // Spur 2 (70% position)
            double spur2_idx = static_cast<double>(i - numPoints * 0.7) / (numPoints / 28.0);
            double spur2 = -52.0 * std::exp(-spur2_idx * spur2_idx);

            double amplitude = noise + signalPeak + spur1 + spur2;

            trace.push_back({frequency, amplitude});
        }

        return trace;
    }

    std::vector<SpectrumPoint> findPeaks(
        const std::vector<SpectrumPoint> &points,
        int maxPeaks)
    {
        if (points.empty())
        {
            return {};
        }

        // Create a copy and sort by amplitude (descending)
        std::vector<SpectrumPoint> sorted = points;
        std::sort(sorted.begin(), sorted.end(),
                  [](const SpectrumPoint &a, const SpectrumPoint &b)
                  {
                      return a.amplitude > b.amplitude;
                  });

        // Take top N peaks
        size_t numPeaks = std::min(static_cast<size_t>(maxPeaks), sorted.size());
        std::vector<SpectrumPoint> peaks(sorted.begin(), sorted.begin() + numPeaks);

        return peaks;
    }

    SpectrumPoint nearestPoint(
        const std::vector<SpectrumPoint> &points,
        double frequencyHz)
    {
        if (points.empty())
        {
            return {0.0, -200.0};
        }

        const SpectrumPoint *nearest = &points[0];
        double bestDistance = std::abs(nearest->frequency - frequencyHz);

        for (size_t i = 1; i < points.size(); ++i)
        {
            double distance = std::abs(points[i].frequency - frequencyHz);
            if (distance < bestDistance)
            {
                bestDistance = distance;
                nearest = &points[i];
            }
        }

        return *nearest;
    }

} // namespace nr5g
