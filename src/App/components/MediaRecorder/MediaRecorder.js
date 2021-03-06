/* eslint-disable indent */
import React, { useRef, useEffect, useState } from 'react';
// eslint-disable-next-line
import adapter from 'webrtc-adapter';

import Header from '../Header/Header';
import AudioMeter from '../AudioMeter/AudioMeter';
import ListRecords from '../ListRecords/ListRecords';
import ControlRecord from '../ControlRecord/ControlRecord';
import ControlHeader from '../ControlHeader/ControlHeader';
import VideoContent from '../VideoContent/VideoContent';
import SettingsRecord from '../SettingsRecord/SettingsRecord';
import ControlType from '../ControlType/ControlType';

import './MediaRecorder.scss';

const MediaRecorder = () => {
    const name = 'Reco';
    const videoElement = useRef();
    const audioInputSelect = useRef();
    const audioOutputSelect = useRef();
    const videoSelect = useRef();
    const constraints = useRef();
    const recorder = useRef(null);
    const chunks = useRef([]);

    const [listItems, setListItems] = useState([]);
    const [onlyAudio, setOnlyAudio] = useState(false);
    const [isVideo, setIsVideo] = useState(true);
    const [isRecord, setIsRecord] = useState(false);
    const [isStart, setIsStart] = useState(false);
    const [isSettings, setIsSettings] = useState(false);
    const [isResult, setIsResult] = useState(false);
    const [count, setCount] = useState(0);

    useEffect(() => {
        const selectors = [
            audioInputSelect.current,
            audioOutputSelect.current,
            videoSelect.current,
        ];
        audioOutputSelect.current.disabled = !(
            'sinkId' in HTMLMediaElement.prototype
        );

        const gotDevices = (deviceInfos) => {
            const values = selectors.map((select) => select.value);
            selectors.forEach((select) => {
                while (select.firstChild) {
                    select.removeChild(select.firstChild);
                }
            });

            for (let i = 0; i !== deviceInfos.length; ++i) {
                const deviceInfo = deviceInfos[i];
                const option = document.createElement('option');
                option.value = deviceInfo.deviceId;
                if (deviceInfo.kind === 'audioinput') {
                    option.text =
                        deviceInfo.label ||
                        `microphone ${audioInputSelect.current.length + 1}`;
                    audioInputSelect.current.appendChild(option);
                } else if (deviceInfo.kind === 'audiooutput') {
                    option.text =
                        deviceInfo.label ||
                        `speaker ${audioOutputSelect.current.length + 1}`;
                    audioOutputSelect.current.appendChild(option);
                } else if (deviceInfo.kind === 'videoinput') {
                    option.text =
                        deviceInfo.label ||
                        `camera ${videoSelect.current.length + 1}`;
                    videoSelect.current.appendChild(option);
                } else {
                    console.log(
                        'Some other kind of source/device: ',
                        deviceInfo,
                    );
                }
            }

            selectors.forEach((select, selectorIndex) => {
                if (
                    Array.prototype.slice
                        .call(select.childNodes)
                        .some((n) => n.value === values[selectorIndex])
                ) {
                    select.value = values[selectorIndex];
                }
            });
        };

        const handleError = (error) => {
            handlerOnlyAudio();
            console.log(
                'navigator.MediaDevices.getUserMedia error: ',
                error.message,
                error.name,
            );
        };

        navigator.mediaDevices
            .enumerateDevices()
            .then(gotDevices)
            .catch(handleError);

        const changeAudioDestination = () => {
            const audioDestination = audioOutputSelect.current.value;
            attachSinkId(videoElement.current, audioDestination);
        };

        const start = () => {
            const audioSource = audioInputSelect.current.value;
            const videoSource = videoSelect.current.value;

            constraints.current = {
                audio: {
                    deviceId: audioSource ? { exact: audioSource } : undefined,
                },
                video: onlyAudio
                    ? false
                    : {
                          deviceId: videoSource
                              ? { exact: videoSource }
                              : undefined,
                      },
            };

            navigator.mediaDevices
                .getUserMedia(constraints.current)
                .then(gotStream)
                .then(gotDevices)
                .catch(handleError);
        };

        audioInputSelect.current.onchange = start;
        audioOutputSelect.current.onchange = changeAudioDestination;

        videoSelect.current.onchange = start;

        start();
    }, [onlyAudio]);

    const attachSinkId = (element, sinkId) => {
        if (typeof element.sinkId !== 'undefined') {
            element
                .setSinkId(sinkId)
                .then(() => {
                    console.log(
                        `Success, audio output device attached: ${sinkId}`,
                    );
                })
                .catch((error) => {
                    let errorMessage = error;
                    if (error.name === 'SecurityError') {
                        errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`;
                    }
                    console.error(errorMessage);
                    // Jump back to first output device in the list as it's the default.
                    audioOutputSelect.current.selectedIndex = 0;
                });
        } else {
            console.warn('Browser does not support output device selection.');
        }
    };

    const gotStream = (stream) => {
        videoElement.current.srcObject = stream;
        recorder.current = new window.MediaRecorder(stream);
        return navigator.mediaDevices.enumerateDevices();
    };

    const recordToList = () => {
        let blob = new Blob(chunks.current, {
            type: onlyAudio ? 'audio' : 'video',
        });
        let url = URL.createObjectURL(blob);
        let currentCount = count + 1;
        let currentRecord = !onlyAudio ? (
            <span className="list-content" key={currentCount}>
                <video controls>
                    <source src={url} type="video/webm" />
                </video>
                <a
                    className="btn btn-sm btn-info"
                    href={url}
                    download={`${currentCount}.mp4`}
                >
                    Download - {currentCount}.mp4
                </a>
            </span>
        ) : (
            <span className="list-content" key={currentCount}>
                <audio controls>
                    <source src={url} type="audio/mp3" />
                </audio>
                <a
                    className="btn btn-sm btn-info"
                    href={url}
                    download={`${currentCount}.mp3`}
                >
                    Download - {currentCount}.mp3
                </a>
            </span>
        );

        let currentList = listItems;
        currentList.unshift(currentRecord);
        setListItems(currentList);
        setCount(count + 1);
    };

    const handlerRecordStream = () => {
        recorder.current.start();
        setIsRecord(true);
    };

    const handlerRecordStop = () => {
        recorder.current.stop();
        recorder.current.ondataavailable = (e) => {
            chunks.current = [];
            chunks.current.push(e.data);
            if (recorder.current.state === 'inactive') recordToList();
        };
        setIsRecord(false);
        setIsResult(true);
    };

    const handlerOnlyAudio = () => {
        setIsVideo(false);
        setOnlyAudio(true);
    };

    const handlerStartRecording = () => {
        setIsStart(!isStart);
    };

    const handlerDeleteEntry = (index) => {
        let newList = listItems;
        newList.splice(index, 1);
        setListItems(newList);
        setCount(count - 1);
    };

    const handleSetOnlyAudio = (e) => {
        e.target.value === 'audio' ? setOnlyAudio(true) : setOnlyAudio(false);
    };

    const handlerRefreshPage = () => {
        window.location.reload();
    };

    const handlerSettings = () => {
        setIsSettings(!isSettings);
        console.log(isSettings);
    };

    const handlerResult = () => {
        setIsResult(!isResult);
    };

    return (
        <div className="container">
            <Header name={name} />

            <ControlHeader
                handlerResult={handlerResult}
                handlerRefreshPage={handlerRefreshPage}
                handlerSettings={handlerSettings}
            />

            <div className="media-content">
                <VideoContent
                    onlyAudio={onlyAudio}
                    videoElement={videoElement}
                />

                <AudioMeter />
            </div>

            <ControlType
                isStart={isStart}
                isVideo={isVideo}
                handleSetOnlyAudio={handleSetOnlyAudio}
                onlyAudio={onlyAudio}
            />

            <SettingsRecord
                isSettings={isSettings}
                onlyAudio={onlyAudio}
                videoSelect={videoSelect}
                audioInputSelect={audioInputSelect}
                audioOutputSelect={audioOutputSelect}
                handlerSettings={handlerSettings}
            />

            <ListRecords
                list={listItems}
                deleteEntry={handlerDeleteEntry}
                isResult={isResult}
                count={count}
                handlerResult={handlerResult}
            />

            <ControlRecord
                isStart={isStart}
                isRecord={isRecord}
                recordStream={handlerRecordStream}
                recordStop={handlerRecordStop}
                startRecording={handlerStartRecording}
            />
        </div>
    );
};

export default MediaRecorder;
