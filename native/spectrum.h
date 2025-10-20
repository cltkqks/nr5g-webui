#ifndef SPECTRUM_H
#define SPECTRUM_H

#include <vector>
#include <cstdint>

namespace nr5g
{

    struct SpectrumPoint
    {
        double frequency;
        double amplitude;
    };

    struct Bounds
    {
        double freqMin;
        double freqMax;
        double ampMin;
        double ampMax;
    };

    /**
     * Compute frequency and amplitude bounds from spectrum points
     */
    Bounds computeBounds(const std::vector<SpectrumPoint> &points);

    /**
     * Compute noise floor using statistical analysis
     * Returns the average of the lowest 20% of amplitudes
     */
    double computeNoiseFloor(const std::vector<SpectrumPoint> &points);

    /**
     * Build screen-space coordinates for rendering
     * Returns interleaved x,y coordinates as flat array
     */
    std::vector<float> buildCoords(
        const std::vector<SpectrumPoint> &points,
        int width,
        int height,
        const Bounds &bounds);

    /**
     * Generate synthetic spectrum trace with signal peaks and noise
     * Used for testing and demonstration
     */
    std::vector<SpectrumPoint> generateSpectrumTrace(
        double centerFreqGHz,
        double spanGHz,
        int numPoints,
        uint32_t seed);

    /**
     * Find top N peaks in spectrum data
     */
    std::vector<SpectrumPoint> findPeaks(
        const std::vector<SpectrumPoint> &points,
        int maxPeaks);

    /**
     * Find nearest point to a given frequency
     */
    SpectrumPoint nearestPoint(
        const std::vector<SpectrumPoint> &points,
        double frequencyHz);

} // namespace nr5g

#endif // SPECTRUM_H
