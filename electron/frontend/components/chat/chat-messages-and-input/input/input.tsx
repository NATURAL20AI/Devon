import { useState, useRef } from 'react'
import { Paperclip, ArrowRight, CirclePause, Axis3DIcon } from 'lucide-react'
import { AutoresizeTextarea } from '@/components/ui/textarea'
import { useEnterSubmit } from '@/lib/hooks/chat.use-enter-submit'
import {
    useCreateResponse,
    useInterruptSession,
} from '@/lib/services/sessionService/sendUserMessage'
import { useSearchParams } from 'next/navigation'
import SelectProjectDirectoryModal from '@/components/modals/select-project-directory-modal'
import AtomLoader from '@/components/ui/atom-loader/atom-loader'
import { SessionMachineContext } from '@/app/home'
import { useBackendUrl } from '@/contexts/BackendUrlContext'

const Input = ({
    isAtBottom,
    scrollToBottom,
    viewOnly,
    eventContext,
    loading,
    sessionId
}: {
    isAtBottom: boolean
    scrollToBottom: () => void
    viewOnly: boolean
    eventContext: any
    loading: boolean
    sessionId: string
}) => {
    const [focused, setFocused] = useState(false)
    const [paused, setPaused] = useState(false)
    const { formRef, onKeyDown } = useEnterSubmit()
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const [input, setInput] = useState('')
    const { createResponse } = useCreateResponse()
    const { interruptSession } = useInterruptSession()
    // For blocking user with modal
    const searchParams = useSearchParams()
    const [openProjectModal, setOpenProjectModal] = useState(false)
    const { backendUrl } = useBackendUrl()

    async function submitUserMessage(value: string) {
        const chatId = searchParams.get('chat')
        // Distinguish between user request vs interrupt
        if (eventContext.userRequest) {
            // setUserRequested(false)
            return createResponse(chatId, value)
        }
        return interruptSession(chatId, value)
    }

    function checkShouldOpenModal() {
        const chatId = searchParams.get('chat')
        // If it's a new chat, open the project modal
        if (chatId && chatId === 'New') {
            setOpenProjectModal(true)
        }
    }

    function handleFocus() {
        setFocused(true)
        checkShouldOpenModal()
    }

    const host = SessionMachineContext.useSelector(state => state.context.host)

    async function handlePause() {
        try {
            
            const response = await fetch(`${host}/session/${sessionId}/pause`, {
                method: "POST"
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setPaused(!paused)
            return data
        } catch (error) {
            console.log(host)
            console.log(error)  
        }
    }

    return (
        <div
            className={`w-full relative grid align-middle px-5 ${!viewOnly ? 'pb-7 mt-8' : ''}`}
        >
            {(loading ||
                eventContext.modelLoading ||
                eventContext.userRequest || paused) && (
                <InformationBox
                    modelLoading={eventContext.modelLoading}
                    userRequested={eventContext.userRequest}
                    loading={loading}
                    paused={paused}
                    pauseHandler={handlePause}
                />
            )}
            {!viewOnly && (
                <>
                    <form
                        ref={formRef}
                        onSubmit={async (e: any) => {
                            e.preventDefault()

                            checkShouldOpenModal()

                            // Blur focus on mobile
                            if (window.innerWidth < 600) {
                                e.target['message']?.blur()
                            }

                            const value = input.trim()
                            setInput('')
                            if (!value) return

                            const res = await submitUserMessage(value)

                            scrollToBottom()
                        }}
                    >
                        <div className="relative">
                            <AutoresizeTextarea
                                ref={inputRef}
                                placeholder="Send a message to Devon ..."
                                onFocus={handleFocus}
                                onBlur={() => setFocused(false)}
                                rows={1}
                                onKeyDown={onKeyDown}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                disabled={loading}
                            />
                            {/* <button
                                onClick={toast}
                                className="absolute left-[0.5rem] top-1/2 -translate-y-1/2 xl:left-[0.75rem] flex h-8 w-8 items-center justify-center rounded-md smooth-hover"
                            >
                                <Paperclip
                                    className={`h-4 w-4 ${focused ? 'text-primary' : ''}`}
                                />
                            </button> */}
                            <button
                                className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 xl:right-4"
                                type="submit"
                            >
                                <ArrowRight
                                    className={`h-4 w-4 ${focused ? 'text-primary' : ''}`}
                                />
                            </button>
                        </div>
                    </form>
                    <SelectProjectDirectoryModal
                        openProjectModal={openProjectModal}
                        setOpenProjectModal={setOpenProjectModal}
                        backendUrl={backendUrl}
                    />
                </>
            )}
        </div>
    )
}

const InformationBox = ({ modelLoading, userRequested, loading, paused, pauseHandler }) => {

    const types: {
        [key: string]: {
            text: string
            accessory: JSX.Element
        }
    } = {
        modelLoading: {
            text: 'Devon is working...',
            accessory: <PauseButton paused={paused} pauseHandler={pauseHandler}/>,
        },
        userRequested: {
            text: 'Devon is waiting for your response',
            accessory: <></>,
        },
        loading: {
            text: 'Devon is gathering himself...',
            accessory: <></>,
        },
    }

    let currentType
    if (loading) {
        currentType = types.loading
    } else {
        currentType = modelLoading ? types.modelLoading : types.userRequested
    }
    if (paused) {
        currentType.text = 'Devon is paused'
        currentType.accessory = <PauseButton paused={paused} pauseHandler={pauseHandler}/>
    }

    return (
        <div className="bg-fade-bottom-to-top2 py-5 px-1">
            <div className="flex items-end justify-between">
                <div className="flex items-center gap-3">
                    <AtomLoader />
                    <p className="italic text-gray-400">{currentType.text}</p>
                </div>
                {currentType.accessory}
            </div>
        </div>
    )
}

export default Input

const PauseButton = ({ paused, pauseHandler }) => {
    if (paused) {
        return (
            <button
                onClick={pauseHandler}
                className="flex items-center gap-2 px-3 py-1 rounded-md mb-[-4px] -mr-2 text-gray-100 smooth-hover"
            >
                <CirclePause size={16} />
                Paused
            </button>
        )
    }
    return (
        <button
            onClick={pauseHandler}
            className="flex items-center gap-2 px-3 py-1 rounded-md text-gray-400 mb-[-4px] -mr-2 hover:text-gray-100 smooth-hover"
        >
            <CirclePause size={16} />
            Pause
        </button>
    )
}
